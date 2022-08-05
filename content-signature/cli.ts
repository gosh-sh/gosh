import { Signer, signerExternal, signerKeys, TonClient } from "@eversdk/core";
import { Argument, Command, Option, program } from "commander";
import { libNode } from "@eversdk/lib-node";
import { checkSignature, deploySignature, getSignatureAddress } from "./index";

/// Bind JS wrapper library to binary core SDK Node.js addon.
TonClient.useBinaryLibrary(libNode);

/// Creates default instance of the SDK client.
let client = new TonClient();

type CommonOptions = {
    network: string,
};

type SignOptions = CommonOptions & {
    giverAddress?: string,
    giverSecret?: string,
    topupAmount: string,
};

function initClient(options: CommonOptions) {
    client = new TonClient({
        network: {
            endpoints: options.network.split(","),
        },
    });
}

/// `addr` command handler.
async function addr(publicKey: string, content: string, options: CommonOptions) {
    initClient(options);
    const address = await getSignatureAddress(client, signerExternal(publicKey), content);
    console.log(address);
}

/// `sign` command handler.
async function sign(secretKey: string, content: string, options: SignOptions) {
    initClient(options);
    const address = await deploySignature(
        client,
        await signerFromSecretKey(client, secretKey),
        content,
        options.topupAmount,
        options.giverAddress,
        options.giverSecret
            ? await signerFromSecretKey(client, options.giverSecret)
            : undefined,
    );
    console.log(address);
}

/// `check` command handler
async function check(publicKey: string, content: string, options: CommonOptions) {
    initClient(options);
    const success = await checkSignature(client, signerExternal(publicKey), content);
    console.log(success);
}

async function signerFromSecretKey(client: TonClient, secretKey: string): Promise<Signer> {
    const keys = (await client.crypto.nacl_sign_keypair_from_secret_key({
        secret: secretKey,
    }));
    keys.secret = keys.secret.substring(0, 64);
    return signerKeys(keys);
}

const args = {
    content: new Argument("content", "Content string"),
    publicKey: new Argument("public", "Signer's public key"),
    secretKey: new Argument("secret", "Signer's secret key"),
};

const options = {
    network: new Option("-n, --network <address>", "Network address(es)").default("http://localhost"),
    giverAddress: new Option("-g, --giver-address <address>", "Topup giver address")
        .argParser(x => x.indexOf(":") >= 0 ? x : `0:${x}`,
        ),
    giverSecret: new Option("-s, --giver-secret <key>", "Topup giver secret"),
    topupAmount: new Option("-е, --topup-amount <value>", "Topup amount").default("1000000000"),
};

(async () => {
    try {
        program.addCommand(new Command("addr")
            .description(
                "Calculates address of the signature account for specified content and signer's public key.",
            )
            .addArgument(args.publicKey)
            .addArgument(args.content)
            .addOption(options.network)
            .action(addr));
        program.addCommand(new Command("sign")
            .description(
                "Signs specified content using provided keys and deploys signature contract to the network.")
            .addArgument(args.secretKey)
            .addArgument(args.content)
            .addOption(options.network)
            .addOption(options.topupAmount)
            .addOption(options.giverAddress)
            .addOption(options.giverSecret)
            .action(sign));
        program.addCommand(new Command("check")
            .description(
                "Verifies that specified content signed by signer with the specified public key.")
            .addArgument(args.publicKey)
            .addArgument(args.content)
            .addOption(options.network)
            .action(check));
        await program.parseAsync(process.argv);
        await client.close();
    } catch (err) {
        console.error(err);
        await client.close();
        process.exit(1);
    }
})();
