import fs from "fs";
import path from "path";
import { Abi, abiContract, ParamsOfEncodeMessage, Signer, TonClient } from "@eversdk/core";

export type ContentSignatureData = {
    _pubkey: string,
    _content: string,
};

const contentSignaturePackage = {
    abi: abiContract(JSON.parse(fs.readFileSync(
        path.resolve("content-signature.abi.json"),
        "utf8",
    ))),
    tvc: fs.readFileSync(
        path.resolve("content-signature.tvc"),
        "base64",
    ),
};

export async function getSignatureAddress(
    client: TonClient,
    signer: Signer,
    content: string,
): Promise<string> {
    return (await client.abi.encode_message(getDeployMessageParams(signer, content))).address;
}

type AccountInfo = {
    data: string,
    acc_type: number
}

async function findAccountInfo(
    client: TonClient,
    address: string,
): Promise<AccountInfo | undefined> {
    const info: AccountInfo[] = (await client.net.query_collection({
        collection: "accounts",
        filter: {
            id: { eq: address },
        },
        limit: 1,
        result: "acc_type data",
    })).result;
    return (info.length > 0 && info[0].acc_type === 1) ? info[0] : undefined;
}

export async function deploySignature(
    client: TonClient,
    signer: Signer,
    content: string,
    topupAmount?: string,
    giverAddress?: string,
    giverSigner?: Signer,
): Promise<string> {
    const deployParams = getDeployMessageParams(signer, content);
    const address = (await client.abi.encode_message(deployParams)).address;

    const info = await findAccountInfo(client, address);
    if (info) {
        return address;
    }
    try {
        if (giverAddress && giverSigner) {
            await topup(client, address, topupAmount ?? "1000000000", giverAddress, giverSigner);
        }
        await client.processing.process_message({
            message_encode_params: deployParams,
            send_events: false,
        });
    } catch (error) {
        if ((error as { code?: number }).code !== 414) {
            throw error;
        }
    }
    return address;
}

// Checks that account this account exists and holds valid signature.
export async function checkSignature(
    client: TonClient,
    signer: Signer,
    content: string,
): Promise<boolean> {
    const abi = contentSignaturePackage.abi;
    const address = await getSignatureAddress(client, signer, content);

    const info = await findAccountInfo(client, address);
    if (!info) {
        return false;
    }
    const data: ContentSignatureData = (await client.abi.decode_account_data({
        abi,
        data: info.data,
    })).data;

    const signerPublic = await getPublicKey(client, signer);
    const pubkey = data._pubkey.substring(2);
    return (pubkey === signerPublic || data._content === content);
}


function getDeployMessageParams(signer: Signer, content: string): ParamsOfEncodeMessage {
    return {
        abi: contentSignaturePackage.abi,
        signer,
        deploy_set: {
            tvc: contentSignaturePackage.tvc,
            initial_data: {
                _content: content,
            },
        },
        call_set: {
            function_name: "constructor",
            input: {},
        },
    };
}

async function getPublicKey(client: TonClient, signer: Signer): Promise<string> {
    switch (signer.type) {
    case "External":
        return signer.public_key;
    case "Keys":
        return signer.keys.public;
    case "SigningBox":
        return (await client.crypto.signing_box_get_public_key({
            handle: signer.handle,
        })).pubkey;
    case "None":
        throw new Error("Can't get public key from none signer");
    }
    throw new Error("Can't get public key");
}


async function topup(
    client: TonClient,
    receiverAddress: string,
    amount: string,
    giverAddress: string,
    giverSigner: Signer,
) {
    const giverInfo: { code_hash?: string | null }[] = (await client.net.query_collection({
        collection: "accounts",
        filter: {
            id: { eq: giverAddress },
        },
        result: "code_hash",
    })).result;
    const giverCodeHash = giverInfo.length > 0 ? giverInfo[0].code_hash : undefined;
    if (giverCodeHash === null || giverCodeHash === undefined) {
        throw new Error("Specified giver has no deployed code");
    }
    const {
        abi,
        input,
    } = getSendInfo(giverCodeHash, receiverAddress, amount);
    await client.processing.process_message({
        message_encode_params: {
            abi,
            address: giverAddress,
            call_set: {
                function_name: "sendTransaction",
                input,
            },
            signer: giverSigner,
        },
        send_events: false,
    });
}

function getSendInfo(
    giverCodeHash: string,
    receiverAddress: string,
    amount: string,
): { abi: Abi, input: { [name: string]: unknown } } {
    switch (giverCodeHash) {
    case "4e92716de61d456e58f16e4e867e3e93a7548321eace86301b51c8b80ca6239b":
    case "ccbfc821853aa641af3813ebd477e26818b51e4ca23e5f6d34509215aa7123d9":
        return {
            abi: giverAbi,
            input: {
                "dest": receiverAddress,
                "value": amount,
                "bounce": false,
            },
        };
    case "e2b60b6b602c10ced7ea8ede4bdf96342c97570a3798066f3fb50a4b2b27a208":
    case "207dc560c5956de1a2c1479356f8f3ee70a59767db2bf4788b1d61ad42cdad82":
    case "80d6c47c4a25543c9b397b71716f3fae1e2c5d247174c52e2c19bd896442b105":
        return {
            abi: walletAbi,
            input: {
                "dest": receiverAddress,
                "value": amount,
                "bounce": false,
                "flags": 1,
                "payload": "",
            },
        };
    default:
        throw new Error("Specified giver type is unsupported");
    }
}

const walletAbi = abiContract({
    "ABI version": 2,
    "header": ["pubkey", "time", "expire"],
    "functions": [
        {
            "name": "sendTransaction",
            "inputs": [
                {
                    "name": "dest",
                    "type": "address",
                },
                {
                    "name": "value",
                    "type": "uint128",
                },
                {
                    "name": "bounce",
                    "type": "bool",
                },
                {
                    "name": "flags",
                    "type": "uint8",
                },
                {
                    "name": "payload",
                    "type": "cell",
                },
            ],
            "outputs": [],
        },
    ],
});

const giverAbi = abiContract({
    "ABI version": 2,
    "header": ["time", "expire"],
    "functions": [
        {
            "name": "sendTransaction",
            "inputs": [
                {
                    "name": "dest",
                    "type": "address",
                },
                {
                    "name": "value",
                    "type": "uint128",
                },
                {
                    "name": "bounce",
                    "type": "bool",
                },
            ],
            "outputs": [],
        },
    ],
});

