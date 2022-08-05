"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSignature = exports.deploySignature = exports.getSignatureAddress = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@eversdk/core");
const contentSignaturePackage = {
    abi: (0, core_1.abiContract)(JSON.parse(fs_1.default.readFileSync(path_1.default.resolve("content-signature.abi.json"), "utf8"))),
    tvc: fs_1.default.readFileSync(path_1.default.resolve("content-signature.tvc"), "base64"),
};
async function getSignatureAddress(client, signer, content) {
    return (await client.abi.encode_message(getDeployMessageParams(signer, content))).address;
}
exports.getSignatureAddress = getSignatureAddress;
async function findAccountInfo(client, address) {
    const info = (await client.net.query_collection({
        collection: "accounts",
        filter: {
            id: { eq: address },
        },
        limit: 1,
        result: "acc_type data",
    })).result;
    return (info.length > 0 && info[0].acc_type === 1) ? info[0] : undefined;
}
async function deploySignature(client, signer, content, topupAmount, giverAddress, giverSigner) {
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
    }
    catch (error) {
        if (error.code !== 414) {
            throw error;
        }
    }
    return address;
}
exports.deploySignature = deploySignature;
async function checkSignature(client, signer, content) {
    const abi = contentSignaturePackage.abi;
    const address = await getSignatureAddress(client, signer, content);
    const info = await findAccountInfo(client, address);
    if (!info) {
        return false;
    }
    const data = (await client.abi.decode_account_data({
        abi,
        data: info.data,
    })).data;
    const signerPublic = await getPublicKey(client, signer);
    const pubkey = data._pubkey.substring(2);
    return (pubkey === signerPublic || data._content === content);
}
exports.checkSignature = checkSignature;
function getDeployMessageParams(signer, content) {
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
async function getPublicKey(client, signer) {
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
async function topup(client, receiverAddress, amount, giverAddress, giverSigner) {
    const giverInfo = (await client.net.query_collection({
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
    const { abi, input, } = getSendInfo(giverCodeHash, receiverAddress, amount);
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
function getSendInfo(giverCodeHash, receiverAddress, amount) {
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
const walletAbi = (0, core_1.abiContract)({
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
const giverAbi = (0, core_1.abiContract)({
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
//# sourceMappingURL=index.js.map