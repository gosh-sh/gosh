const fs = require('fs');
const os = require('os');
const path = require('path');
const { TonClient, abiContract, abiJson, signerKeys, signerNone } = require('@eversdk/core');
const { libNode } = require("@eversdk/lib-node");

const readConfig = () => {
    CONFIG = JSON.parse(fs.readFileSync("./config.json"));
    if (!CONFIG.localNode) {
        CONFIG.url = CONFIG.urlWeb;
        CONFIG.giverKeys = devNetGiverKeys;
    };
    return CONFIG;
}
// for devnet
const devNetGiverAddress = '0:3282fb4cce2cde32cca0bc11edf3df8fb32c3847ec8b75f4e678718cde2f6bb0';
const devNetGiverAbiDev = {
    "ABI version": 2,
    "header": ["pubkey", "time", "expire"],
    "functions": [
        {
            "name": "submitTransaction",
            "inputs": [
                { "name": "dest", "type": "address" },
                { "name": "value", "type": "uint128" },
                { "name": "bounce", "type": "bool" },
                { "name": "allBalance", "type": "bool" },
                { "name": "payload", "type": "cell" }
            ],
            "outputs": [
                { "name": "transId", "type": "uint64" }
            ]
        },
    ],
    "data": [
    ],
    "events": [
    ]
};
const devNetGiverKeys = {
    "public": "41a71ceaa7ac96eda2b261cfeeec2a52120fe93f744eb6909b2a33eb183f7ba2",
    "secret": "4565f3d76cbf69bbf335de22cf7c99beb2c57fc30de62d540812663fb5839c25"
};


// for nodeSE
const nodeSeGiverAddress = '0:841288ed3b55d9cdafa806807f02a0ae0c169aa5edfe88a789a6482429756a94';
const nodeSeGiverAbi =
{
    "ABI version": 1,
    "functions": [
        {
            "name": "constructor",
            "inputs": [],
            "outputs": []
        },
        {
            "name": "sendGrams",
            "inputs": [
                { "name": "dest", "type": "address" },
                { "name": "amount", "type": "uint64" }
            ],
            "outputs": []
        }
    ],
    "events": [],
    "data": []
};

let CLIENT;
let CONFIG;

let gosh;

let daoCreatorPackage;
let goshWalletPackage = {};
let goshDaoPackage;
let repoPackage;
let commitPackage;
let blobPackage;


async function loadPackage(name) {
    const contract = {
        abi: JSON.parse(fs.readFileSync(`../${name}.abi.json`, 'utf8')),
        imageBase64: fs.readFileSync(`../${name}.tvc`).toString('base64')
    }
    const { code, data } = await CLIENT.boc.decode_tvc({ tvc: contract.imageBase64 });
    contract.code = code;
    contract.data = data;
    contract.name = name;
    return contract;
};

async function init() {
    readConfig();
    const sdkConfig = { network: { endpoints: CONFIG.url } };
    TonClient.useBinaryLibrary(libNode);
    CLIENT = new TonClient(sdkConfig);
};

async function waitForResultXN(result) {
    await CLIENT.net.query_transaction_tree({ in_msg: result.transaction.in_msg, timeout: 60000 * 5 });
};

async function deploy(contract, keys, options = {}, balance = 100) {
    if (!keys) {
        keys = await CLIENT.crypto.generate_random_sign_keys();
    }
    const msg = await CLIENT.abi.encode_message({
        abi: abiContract(contract.abi),
        call_set: { function_name: "constructor", input: options },
        deploy_set: { tvc: contract.imageBase64 },
        signer: keys ? signerKeys(keys) : signerNone(),
    });
    const futureAddress = msg.address;

    await sendGrams(futureAddress, balance * 1e9);

    const txn = await CLIENT.processing.send_message({
        abi: abiContract(contract.abi),
        message: msg.message,
        send_events: false
    });
    await CLIENT.processing.wait_for_transaction({
        message: msg.message,
        send_events: false,
        shard_block_id: txn.shard_block_id
    });

    contract.keys = keys;
    contract.address = futureAddress;
    console.log(`Deploying ${contract.name} - ${contract.address}`);
    return contract;
};

async function sendGrams(destAddr, amount) {
    if (CONFIG.localNode) {
        const result = await CLIENT.processing.process_message({
            send_events: false,
            message_encode_params: {
                address: nodeSeGiverAddress,
                abi: abiContract(nodeSeGiverAbi),
                call_set: {
                    function_name: 'sendGrams',
                    input: { dest: destAddr, amount: amount }
                },
                signer: signerNone()
            }
        });
        await waitForResultXN(result);
    } else {
        const result = await CLIENT.processing.process_message({
            send_events: false,
            message_encode_params: {
                address: devNetGiverAddress,
                abi: abiContract(devNetGiverAbiDev),
                call_set: {
                    function_name: 'submitTransaction',
                    input: {
                        dest: destAddr,
                        value: amount,
                        bounce: false,
                        allBalance: false,
                        payload: ''
                    }
                },
                signer: signerKeys(CONFIG.giverKeys)
            }
        });
        await waitForResultXN(result);
    }
};

async function call(contract, func, params) {
    const result = await CLIENT.processing.process_message({
        send_events: false,
        message_encode_params: {
            address: contract.address,
            abi: abiContract(contract.abi),
            call_set: {
                function_name: func,
                input: params
            },
            signer: signerKeys(contract.keys)
        }
    });
    await waitForResultXN(result);
};

async function run(contract, function_name, input = {}) {
    const msg = await CLIENT.abi.encode_message({
        abi: abiContract(contract.abi),
        address: contract.address,
        call_set: {
            function_name: function_name,
            input: input
        },
        signer: signerNone()
    });
    const account = (await CLIENT.net.query_collection({
        collection: 'accounts',
        filter: { id: { eq: contract.address } },
        timeout: 40000,
        result: 'boc'
    })).result[0].boc;
    return (await CLIENT.tvm.run_tvm({ message: msg.message, account, abi: abiContract(contract.abi) })).decoded;
};

async function makeKeypair() {
    return await CLIENT.crypto.generate_random_sign_keys();
};

async function getBalance(addr) {
    const balance = (await getAccount(addr)).balance;
    return balance / 1e9;
};

async function getAccount(addr) {
    const queryResult = (await CLIENT.net.query_collection({
        collection: 'accounts',
        filter: { id: { eq: addr } },
        result: 'id balance acc_type'
    })).result;

    if (queryResult.length) {
        const accountData = queryResult[0]
        if (accountData.id !== addr) {
            console.log(`Something wrong: requested addr = ${addr}, received addr = ${accountData.id}`)
            return null
        };
        return accountData;
    };
    return null;
};

async function calcDeployAddress(contract, keys, options) {
    const msg = await CLIENT.abi.encode_message({
        abi: abiContract(contract.abi),
        call_set: { function_name: "constructor", input: options },
        deploy_set: { tvc: contract.imageBase64 },
        signer: keys ? signerKeys(keys) : signerNone(),
    });
    return msg.address;
};

//***************************************************************************************************/

//------------------------------- Gosh-----------------------------------
async function deployGosh() {
    // keys gosh and daoCreator
    const keys = await makeKeypair();
    // calculate future address of the dao creator
    const daoCreatorPackage = await loadPackage('daocreator');
    const options = {
        gosh: '',
        WalletCode: '',
        WalletData: '',
        codeDao: '',
        dataDao: ''
    };
    const daoCreatorFutAddr = await calcDeployAddress(daoCreatorPackage, keys, options);

    // deploy gosh
    const goshPackage = await loadPackage('gosh');
    gosh = await deploy(goshPackage, keys, { creator: daoCreatorFutAddr }, 1000);
    repoPackage = await loadPackage('repository');
    await call(gosh, 'setRepository', { code: repoPackage.code, data: repoPackage.data });
    commitPackage = await loadPackage('commit');
    await call(gosh, 'setCommit', { code: commitPackage.code, data: commitPackage.data });
    blobPackage = await loadPackage('blob');
    await call(gosh, 'setBlob', { code: blobPackage.code, data: blobPackage.data });
    goshWalletPackage = await loadPackage('goshwallet');
    await call(gosh, 'setWallet', { code: goshWalletPackage.code, data: goshWalletPackage.data });
    goshDaoPackage = await loadPackage('goshdao');
    await call(gosh, 'setDao', { code: goshDaoPackage.code, data: goshDaoPackage.data });
    let tagPackage = await loadPackage('tag');
    await call(gosh, 'setTag', { code: tagPackage.code, data: tagPackage.data });
    let tokenWalletPackage = await loadPackage('../smv/External/tip3/TokenWallet');
    await call(gosh, 'setTokenWallet', { code: tokenWalletPackage.code, value1: tokenWalletPackage.data });
    let tokenLockerPackage = await loadPackage('../smv/SMVTokenLocker');
    await call(gosh, 'setTokenLocker', { code: tokenLockerPackage.code, value1: tokenLockerPackage.data });
    let smvPlatformPackage = await loadPackage('../smv/LockerPlatform');
    await call(gosh, 'setSMVPlatform', { code: smvPlatformPackage.code, value1: smvPlatformPackage.data });
    let smvClientPackage = await loadPackage('../smv/SMVClient');
    await call(gosh, 'setSMVClient', { code: smvClientPackage.code, value1: smvClientPackage.data });
    let smvProposalPackage = await loadPackage('../smv/SMVProposal');
    await call(gosh, 'setSMVProposal', { code: smvProposalPackage.code, value1: smvProposalPackage.data });
    return gosh;
};

// ----------------------------Dao------------------------------------
async function deployDaoCreator(gosh) {
    daoCreatorPackage = await loadPackage('daocreator');
    const params = {
        gosh: gosh.address,
        WalletCode: goshWalletPackage.code,
        WalletData: goshWalletPackage.data,
        codeDao: goshDaoPackage.code,
        dataDao: goshDaoPackage.data
    };
    daoCreator = await deploy(daoCreatorPackage, gosh.keys, params, 200000);
    return daoCreator;
};

async function deployDao(name, pubkey) {
    await call(daoCreator, 'deployDao', { name: name, root_pubkey: `0x${pubkey}` });
    const dao = Object.assign({}, goshDaoPackage);
    dao.address = (await run(gosh, 'getAddrDao', { name: name })).output.value0;
    dao.name = name;
    if (await getAccount(dao.address)) {
        console.log(`Dao ${dao.name} created at address: ${dao.address}`);
    };
    return dao;
};

async function deleteWallet(dao, wallet) {
    await call(dao, 'deleteWallet', { pubkey: `0x${wallet.keys.public}` });
    console.log( `In ${dao.name} deleted wallet at address: ${wallet.address}` );
}

// ---------------------wallet-----------------------------
async function deployWallet(dao, pubkey) {
    await call(dao, 'deployWallet', { pubkey: `0x${pubkey}` });
    const wallet = Object.assign({}, goshWalletPackage);
    wallet.address = (await run(dao, 'getAddrWallet', { pubkey: `0x${pubkey}` })).output.value0;
    if (await getAccount(wallet.address)) {
        console.log(`${dao.name} has deployed wallet address : ${wallet.address}`);
        console.log('wallet balance:', await getBalance(wallet.address));
    };
    return wallet;
};

// for deleting repositiry, commit, blob
async function deleteObject(wallet, objectAddr) {
    await call(wallet, 'destroyObject', { obj: objectAddr });
    console.log('Deleted object at address:', objectAddr);
}

// ---------------------repository-------------------------
async function deployRepository(gosh, dao, wallet, nameRepo) {
    await call(wallet, 'deployRepository', { nameRepo: nameRepo });
    const repo = Object.assign({}, repoPackage);
    repo.address = (await run(gosh, 'getAddrRepository', { name: nameRepo, dao: dao.name })).output.value0;
    repo.name = nameRepo;
    if (await getAccount(repo.address)) {
        console.log(`Dao ${dao.name} has deployed repository ${repo.name} at address ${repo.address}`);
    };
    return repo;
};

// ----------------------branch------------------------------
async function createBranch(wallet, repoName, newName, fromName) {
    const params = { repoName, newName, fromName }
    await call(wallet, 'deployBranch', params);
    console.log(`In repository ${repoName} create branch ${newName}`);
};

async function deleteBranch(wallet, repoName, branchName) {
    const params = { repoName, Name: branchName };
    await call(wallet, 'deleteBranch', params);
    console.log(`In repository ${repoName} delete branch ${branchName}`);
};

async function listBranches(repo) {
    const branches = (await run(repo, 'getAllAddress')).output.value0;
    return branches;
};

async function getBranch(repo, name) {
    const branch = (await run(repo, 'getAddrBranch', { name })).output.value0;
    return branch;
};

//------------------------commit---------------------------
async function deployCommit(
    wallet,
    repo,
    repoName,
    branchName,
    commitName,
    fullCommit,
    parents
) {
    const params = {
        repoName,
        branchName,
        commitName,
        fullCommit,
        parents
    };
    await call(wallet, 'deployCommit', params);
    const commit = Object.assign({}, commitPackage);
    commit.address = (await run(repo, 'getCommitAddr', { nameCommit: commitName })).output.value0;
    if (await getAccount(commit.address)) {
        console.log(`Deploy commit on ${commit.address}`);
    };
    return commit;
};

function createCommitObject(addr, name='') {
    const commit = Object.assign({}, commitPackage);
    commit.address = addr;
    commit.name = name;
    return commit;
};

async function getCommit(commit) {
    const commitData = await run(commit, 'getCommit');
    return commitData.output;
};

/* async function getNameCommit(commit) {
    const commitName = await run(commit, 'getNameCommit', {});
    return commitName;
}; */


//------------------------blob-----------------------------
async function deployBlob(
    wallet,
    repo,
    repoName,
    commit,
    branch,
    blobName,
    fullBlob,
    ipfsBlob,
    prevSha,
    flags
) {
    const params = {
        repoName,
        commit,
        branch,
        blobName,
        fullBlob,
        ipfsBlob,
        prevSha,
        flags
    };

    await call(wallet, 'deployBlob', params);

    const blob = Object.assign({}, blobPackage);
    blob.address = (await run(repo, 'getBlobAddr', { nameBlob: blobName })).output.value0;

    if (await getAccount(blob.address)) {
        console.log(`Deploy blob on ${blob.address}`);
    };
    return blob;
};

async function getBlob(blob) {
    const blobData = await run(blob, 'getBlob');
    return blobData;
};

async function getprevSha(blob) {
    const blobPrevSha = await run(blob, 'getprevSha');
    return blobPrevSha;
}

// ---------------------exports----------------------------

module.exports = {
    init,
    getBalance,
    getAccount,
    sendGrams,
    deployGosh,
    deployDaoCreator,
    deployDao,
    makeKeypair,
    deployWallet,
    deployRepository,
    createBranch,
    listBranches,
    getBranch,
    deleteBranch,
    deployCommit,
    deployBlob,
    getCommit,
    //getNameCommit,
    getBlob,
    getprevSha,
    createCommitObject,
    deleteObject,
    deleteWallet,
}
