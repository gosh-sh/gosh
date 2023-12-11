const assert = require('assert');
const helper = require('./everscale.js');
const objects = require('./objects.js');

const BRANCH_DEFAULT_NAME = 'main';
const ZERO_COMMIT = '0000000000000000000000000000000000000000';

describe('Gosh contract test', function () {
    let gosh;
    let daoCreator;

    let dao1;
    let wallet1;

    let repo1;

    before(async function () {
        await helper.init()
    });

    describe('Deploy contracts', function () {
        this.timeout(400000);
        let wallet2;
        let repo2;
        let listBranches;

        let runError;

        it('Deploy gosh contract. @deploy', async function () {
            gosh = await helper.deployGosh();
        });

        it('Deploy daoCreator contract. @deploy', async function () {
            daoCreator = await helper.deployDaoCreator(gosh);
        });

        it('Create dao contract - dao1. @deploy', async function () {
            const keys = await helper.makeKeypair();
            // * wrong name - test failed
            try {
                await helper.deployDao('Dao1', keys.public);
            } catch(error) {
                runError = error;
            }
            assert.equal(runError.code, 414);
            assert.equal(runError.data.exit_code, 222);
            runError = {};

            dao1 = await helper.deployDao('dao1', keys.public);
            dao1.keys = keys;
        });

        it('dao1 create goshWallet. @deploy', async function () {
            // keys user
            const keys = await helper.makeKeypair();
            wallet1 = await helper.deployWallet(dao1, keys.public);
            wallet1.keys = keys;
        });

        it('Create repository. @deploy', async function () {
            // * wrong name - test failed
            try {
                await helper.deployRepository(gosh, dao1, wallet1, 'Repo1');
            } catch(error) {
                runError = error;
            }
            assert.equal(runError.code, 414);
            assert.equal(runError.data.exit_code, 222);
            runError = {};

            const walletBalanceBefore = await helper.getBalance(wallet1.address);
            repo1 = await helper.deployRepository(gosh, dao1, wallet1, 'repo1');
            const walletBalanceAfter = await helper.getBalance(wallet1.address);
            assert.notEqual(walletBalanceBefore, walletBalanceAfter);

            // when creating a repository 0 commit is created
            listBranches  = await helper.listBranches(repo1);
            // checking data 0 commit
            assert.equal(listBranches.length, 1); //     main
            const commit0 = helper.createCommitObject(listBranches[0].value);
            const commitData = await helper.getCommit(commit0);
            assert.equal(commitData.repo, repo1.address);
            assert.equal(commitData.branch, BRANCH_DEFAULT_NAME);
            assert.equal(commitData.sha, ZERO_COMMIT);
            assert.equal(commitData.parents.length, 0);
            assert.equal(commitData.content, '');
        });

        it('Testing push data into repo (commit-tree-snapshot/diff)', async function () {
            // replenishment of the wallet-contract balance
            await helper.sendGrams(wallet1.address, 1000e9);
            assert(1000 <= (await helper.getBalance(wallet1.address)));

            // create branch
            const branch = 'branch1';
            await helper.createBranch(wallet1, 'repo1', branch, BRANCH_DEFAULT_NAME);
            listBranches  = await helper.listBranches(repo1);
            assert.equal(listBranches.length, 2); //     main, branch1

            let rez = await helper.getBranch(repo1, branch);
            assert.equal(rez.key, branch);

            // *push and fetch from repodata
            const commit1 = await helper.deployCommit(
                wallet1,
                repo1,
                repo1.name,
                branch,
                objects.commit1.sha,
                objects.commit1.content,
                objects.commit1.parents
            );
            // ? verify push data
            const rezCommit1 = await helper.getCommit(commit1);
            assert.equal(objects.commit1.sha, rezCommit1.sha);
            assert.equal(objects.commit1.content, rezCommit1.content);
            assert(objects.commit1.parents, rezCommit1.parents);

            const commit2 = await helper.deployCommit(
                wallet1,
                repo1,
                repo1.name,
                branch,
                objects.commit2.sha,
                objects.commit2.content,
                objects.commit2.parents
            );

            // ? verify push data
            const rezCommit2 = await helper.getCommit(commit2);
            assert.equal(objects.commit2.sha, rezCommit2.sha);
            assert.equal(objects.commit2.content, rezCommit2.content);
            assert(objects.commit2.parents, rezCommit2.parents);

            const commit3 = await helper.deployCommit(
                wallet1,
                repo1,
                repo1.name,
                branch,
                objects.commit3.sha,
                objects.commit3.content,
                objects.commit3.parents
            );

            // ?verify push data
            const rezCommit3 = await helper.getCommit(commit3);
            assert.equal(objects.commit3.sha, rezCommit3.sha);
            assert.equal(objects.commit3.content, rezCommit3.content);
            assert(objects.commit3.parents, rezCommit3.parents);
        });

        it('test: create and delete a repository, check the balance at each step', async function () {
            const wallet1BalanceBefore = await helper.getBalance(wallet1.address);
            // create repo2
            repo2 = await helper.deployRepository(gosh, dao1, wallet1, 'repo2');

            const wallet1BalanceAfter = await helper.getBalance(wallet1.address);
            assert(wallet1BalanceBefore > wallet1BalanceAfter);

            // delete repo2
            await helper.deleteObject(wallet1, repo2.address);

            const wallet1BalanceAfterDelete = await helper.getBalance(wallet1.address);
            assert(wallet1BalanceAfterDelete > wallet1BalanceAfter); // ! balance repo2 sent to balance wallet1 after deletion
            // checking that the repository has been deleted
            const accountData = await helper.getAccount(repo2.address);
            assert.equal(accountData.balance, null);
            assert.equal(accountData.acc_type, 3); // 3 – nonExist
        });

        it('test: create and delete a wallet, check the balance at each step', async function () {
            // create wallet
            const keys = await helper.makeKeypair();
            wallet2 = await helper.deployWallet(dao1, keys.public);
            wallet2.keys = keys;

            const daoBalanceBefore = await helper.getBalance(dao1.address);

            // deleting wallet
            await helper.deleteWallet(dao1, wallet2);

            const daoBalanceAfter = await helper.getBalance(dao1.address);
            assert(daoBalanceAfter > daoBalanceBefore);  // ! balance wallet2 sent to balance dao1 after deletion

            // checking that the wallet has been deleted
            const accountData = await helper.getAccount(wallet2.address);
            assert.equal(accountData.balance, null);
            assert.equal(accountData.acc_type, 3); // 3 – nonExist
        });
    
        it('Delete branch1', async function () {
            // delete branch
            const listBranchesBefore = await helper.listBranches(repo1);
            assert.equal(listBranchesBefore.length, 2); //     main

            await helper.deleteBranch(wallet1, 'repo1', 'branch1');
            listBranches = await helper.listBranches(repo1);
            assert.equal(listBranches.length, 1); //     main
        });
    });

    describe('Cases:', function () {
        this.timeout(400000);
        it('Creating 2 daos and creating a repository by the wallet one dao to another dao ----> failed', async function () {
            // create DAOX and DAOY
            const keysDaoX = await helper.makeKeypair();
            const daoX = await helper.deployDao('daox', keysDaoX.public);
            daoX.keys = keysDaoX;
    
            const keysDaoY = await helper.makeKeypair();
            const daoY = await helper.deployDao('daoy', keysDaoY.public);
            daoY.keys = keysDaoY;

            // in DAOY create WALLET3
            const keysWalletY = await helper.makeKeypair();
            const walletY = await helper.deployWallet(daoY, keysWalletY.public);
            walletY.keys = keysWalletY;

            // create repoX_1 in DAOX via walletY(DAOY) --->  failed
            const repoX_1 = await helper.deployRepository(gosh, daoX, walletY, 'repox1');

            // checking that the contract repository has not been created
            assert.equal(await helper.getAccount(repoX_1.address), null);
        });
    });

    describe('Print data', function () {
        it('Print data. @deploy', async function () {
            console.log('*******************************************************************************************')
            console.log('Gosh address:', gosh.address);
            console.log('Gosh keys:', gosh.keys);
            console.log('Dao creator address:', daoCreator.address);
            console.log('Dao creator keys:', daoCreator.keys);
            console.log('Dao address:', dao1.address);
            console.log('Dao keys:', dao1.keys);
            console.log('wallet:');
            const wallet = {
                address: wallet1.address,
                keys: wallet1.keys
            }
            console.log(JSON.stringify(wallet));
            console.log('repository:', repo1.address);
        });
    });

});
