"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@eversdk/core");
const commander_1 = require("commander");
const lib_node_1 = require("@eversdk/lib-node");
const index_1 = require("./index");
core_1.TonClient.useBinaryLibrary(lib_node_1.libNode);
let client = new core_1.TonClient();
function initClient(options) {
    client = new core_1.TonClient({
        network: {
            endpoints: options.network.split(","),
        },
    });
}
async function addr(publicKey, content, options) {
    initClient(options);
    const address = await (0, index_1.getSignatureAddress)(client, (0, core_1.signerExternal)(publicKey), content);
    console.log(address);
}
async function sign(secretKey, content, options) {
    initClient(options);
    const address = await (0, index_1.deploySignature)(client, await signerFromSecretKey(client, secretKey), content, options.topupAmount, options.giverAddress, options.giverSecret
        ? await signerFromSecretKey(client, options.giverSecret)
        : undefined);
    console.log(address);
}
async function check(publicKey, content, options) {
    initClient(options);
    const success = await (0, index_1.checkSignature)(client, (0, core_1.signerExternal)(publicKey), content);
    console.log(success);
}
async function signerFromSecretKey(client, secretKey) {
    const keys = (await client.crypto.nacl_sign_keypair_from_secret_key({
        secret: secretKey,
    }));
    keys.secret = keys.secret.substring(0, 64);
    return (0, core_1.signerKeys)(keys);
}
const args = {
    content: new commander_1.Argument("content", "Content string"),
    publicKey: new commander_1.Argument("public", "Signer's public key"),
    secretKey: new commander_1.Argument("secret", "Signer's secret key"),
};
const options = {
    network: new commander_1.Option("-n, --network <address>", "Network address(es)").default("http://localhost"),
    giverAddress: new commander_1.Option("-g, --giver-address <address>", "Topup giver address")
        .argParser(x => x.indexOf(":") >= 0 ? x : `0:${x}`),
    giverSecret: new commander_1.Option("-s, --giver-secret <key>", "Topup giver secret"),
    topupAmount: new commander_1.Option("-е, --topup-amount <value>", "Topup amount").default("1000000000"),
};
(async () => {
    try {
        commander_1.program.addCommand(new commander_1.Command("addr")
            .description("Calculates address of the signature account for specified content and signer's public key.")
            .addArgument(args.publicKey)
            .addArgument(args.content)
            .addOption(options.network)
            .action(addr));
        commander_1.program.addCommand(new commander_1.Command("sign")
            .description("Signs specified content using provided keys and deploys signature contract to the network.")
            .addArgument(args.secretKey)
            .addArgument(args.content)
            .addOption(options.network)
            .addOption(options.topupAmount)
            .addOption(options.giverAddress)
            .addOption(options.giverSecret)
            .action(sign));
        commander_1.program.addCommand(new commander_1.Command("check")
            .description("Verifies that specified content signed by signer with the specified public key.")
            .addArgument(args.publicKey)
            .addArgument(args.content)
            .addOption(options.network)
            .action(check));
        await commander_1.program.parseAsync(process.argv);
        await client.close();
    }
    catch (err) {
        console.error(err);
        await client.close();
        process.exit(1);
    }
})();
//# sourceMappingURL=cli.js.map