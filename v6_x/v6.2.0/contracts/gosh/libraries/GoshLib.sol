// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
import "../goshwallet.sol";
import "../tree.sol";
import "../snapshot.sol";
import "../systemcontract.sol";
import "../diff.sol";
import "../daotag.sol";
import "../task.sol";
import "../content-signature.sol";
import "../topic.sol";
import "../taggosh.sol";
import "../goshdao.sol";
import "../tag.sol";
import "../profile.sol";
import "../profiledao.sol";
import "../grant.sol";

contract IRootToken {
    bool static __uninitialized;
    uint64 static __replay;
    string static name_;
    string static symbol_;
    uint8 static decimals_;
    uint256 static root_pubkey_;
    optional(address) static root_owner_;
    uint128 static total_supply_;
    uint128 static total_granted_;
    optional(TvmCell) static wallet_code_;
    address static checker_;
    uint256 static ethroot_;
    uint128 static burncount_;
    optional(address) static oldroot_;
    optional(address) static newroot_;
    address static receiver_;
    optional(address) static trusted_;
    bool static flag_;
    uint32 static money_timestamp_;

    constructor(string name, string symbol, uint8 decimals, uint256 root_pubkey, optional(address) root_owner, uint128 total_supply, address checker, uint256 eth_root, optional(address) oldroot, optional(address) newroot, address receiver, optional(address) trusted) functionID(0xa) {
    }
}


library GoshLib {
    string constant versionLib = "6.2.0";

//ROOT PART
    function calculateRootAddress(TvmCell code, RootData root, uint256 pubkey, address receiver) public returns(address) {
        TvmCell s1 = composeRootStateInit(code, root.name, root.symbol, root.decimals, root.ethroot, pubkey, receiver);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeRootStateInit(TvmCell code, string name, string symbol, uint8 decimals, uint256 ethroot, uint256 pubkey, address receiver) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: code,
            contr: IRootToken,
            varInit: {name_ : name, symbol_ : symbol, decimals_ : decimals, ethroot_ : ethroot, root_pubkey_: pubkey, root_owner_: null, receiver_: receiver, trusted_: null}
        });
        return s1;
    }

//Address part
    function calculateTaskAddress(TvmCell code, address goshdao, address repo, string nametask) public returns(address) {
        TvmCell stateInit = composeTaskStateInit(code, goshdao, repo, nametask);
        return address.makeAddrStd(0, tvm.hash(stateInit));    
    } 

    function calculateBigTaskAddress(TvmCell code, address goshdao, address repo, string nametask) public returns(address) {
        TvmCell stateInit = composeTaskStateInit(code, goshdao, repo, nametask);
        return address.makeAddrStd(0, tvm.hash(stateInit));    
    } 

    function calculateProfileIndexAddress(TvmCell code, address versionController, uint256 pubkey, string name) public returns(address) {
        TvmCell stateInit = composeProfileIndexStateInit(code, versionController, pubkey, name);
        return address.makeAddrStd(0, tvm.hash(stateInit));    
    } 

    function calculateSystemContractAddress(TvmCell code, uint256 pubkey) public returns(address) {
        TvmCell stateInit = composeSystemContractStateInit(code, pubkey);
        return address.makeAddrStd(0, tvm.hash(stateInit));    
    }   

    function calculateTreeAddress(TvmCell code, uint256 shainnertree, address rootRepo) public returns(address) {
        TvmCell deployCode = buildTreeCode(code, versionLib);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaInnerTree: shainnertree, _repo: rootRepo}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function calculateSnapshotAddress(TvmCell code, address repo, string commitsha, string name) public returns(address) {
        TvmCell deployCode = buildSnapshotCode(code, repo, versionLib);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: name, _baseCommit: commitsha}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function composeSnapshotStateInit(TvmCell code, address repo, string commitsha, string name) public returns(TvmCell) {
        TvmCell deployCode = buildSnapshotCode(code, repo, versionLib);
        return tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: name, _baseCommit: commitsha}});
    }

    function calculateRepositoryAddress(TvmCell code, address systemcontract, address goshdao, string name) public returns (address) {
        TvmCell deployCode = buildRepositoryCode(
            code, systemcontract, goshdao, versionLib
        );
        return address(tvm.hash(tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: { _name: name }
        })));
    }

    function calculateCommitAddress(
        TvmCell code,
        address repo,
        string commit
    ) public returns(address) {
        TvmCell deployCode = buildCommitCode(code, repo, versionLib);
        TvmCell state = tvm.buildStateInit({
            code: deployCode,
            contr: Commit,
            varInit: { _nameCommit: commit }
        });
        return address(tvm.hash(state));
    }

    function calculateWalletAddress(TvmCell code, address systemcontract, address goshdao, address pubaddr, uint128 index) public returns(address) {
        TvmCell deployCode = buildWalletCode(code, pubaddr, versionLib);
        TvmCell s1 = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: { _systemcontract: systemcontract, _goshdao: goshdao, _index: index}
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }   

    function calculateDiffAddress(TvmCell code, address repo, string commit, uint128 index1, uint128 index2) public returns(address) {
        TvmCell deployCode = buildCommitCode(code, repo, versionLib);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});  
        return  address(tvm.hash(s1));
    }
    
    function calculateDaoAddress(TvmCell code, address systemcontract, string name) public returns(address) {
        TvmCell deployCode = buildDaoCode(code, name, versionLib);
        TvmCell s1 = tvm.buildStateInit({
            code: deployCode,
            contr: GoshDao,
            varInit: { _systemcontract : systemcontract }
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateDaoTagAddress(TvmCell code, address versionController, address goshdao, string daotag) public returns(address){        
        TvmCell deployCode = buildDaoTagCode(code, daotag, versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: DaoTag, varInit: {_goshdao: goshdao}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }
  
    function calculateContentAddress(TvmCell code, 
        address systemcontract,
        address goshdao,
        address repo,
        string commit,
        string label) public returns(address) {
        TvmCell deployCode = buildSignatureCode(code, repo, versionLib);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : systemcontract, _goshdao : goshdao}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateTopicAddress(TvmCell code, address goshdao, string name, string content, address object) public returns(address) {
        TvmCell s1 = composeTopicStateInit(code, goshdao, name, content, object);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateCommentAddress(TvmCell code, address goshdao, string name, string content, address object, optional(string) metadata, optional(string) commit, optional(string) nameoffile) public returns(address) {
        TvmCell s1 = composeCommentStateInit(code, goshdao, name, content, object, metadata, commit, nameoffile);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateProfileAddress(TvmCell code, address versionController, string name) public returns(address) {
        TvmCell s1 = composeProfileStateInit(code, versionController, name);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateProfileDaoAddress(TvmCell code, address versionController, string name) public returns(address) {
        TvmCell s1 = composeProfileDaoStateInit(code, versionController, name);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateTaskTagGoshAddress(TvmCell code, address versionController, address goshdao, address repo, address task, string tag) public returns(address){        
        TvmCell deployCode = buildTaskTagGoshCode(code, tag, versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: goshdao, _repo: repo, _task: task}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function calculateTaskTagDaoAddress(TvmCell code, address versionController, address goshdao, address repo, address task, string tag) public returns(address){        
        TvmCell deployCode = buildTaskTagDaoCode(code, tag, goshdao, versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: goshdao, _repo: repo, _task: task}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function calculateTaskTagRepoAddress(TvmCell code, address versionController, address goshdao, address repo, address task, string tag) public returns(address){        
        TvmCell deployCode = buildTaskTagRepoCode(code, tag, goshdao, repo, versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: goshdao, _repo: repo, _task: task}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }
   
    function calculateRepoTagGoshAddress(TvmCell code, address versionController, address goshdao, address repo, string repotag) public returns(address){        
        TvmCell deployCode = buildRepoTagGoshCode(code, repotag, versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: goshdao, _repo: repo}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function calculateRepoTagDaoAddress(TvmCell code, address versionController, address goshdao, address repo, string repotag) public returns(address){        
        TvmCell deployCode = buildRepoTagDaoCode(code, repotag, goshdao, versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: goshdao, _repo: repo}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateTagAddress(TvmCell code, address repo, string nametag) public returns(address){        
        TvmCell deployCode = composeTagStateInit(code, repo, nametag);
        return address.makeAddrStd(0, tvm.hash(deployCode));
    }


    function calculateGrantAddress(TvmCell code, address dao, string name) public returns(address) {
        TvmCell s1 = composeGrantStateInit(code, dao, name);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeProfileStateInit(TvmCell code, address versionController, string name) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: code,
            contr: Profile,
            varInit: {_name : name, _versioncontroller: versionController}
        });
        return s1;
    }

    function composeTaskStateInit(TvmCell code, address goshdao, address repo, string nametask) public returns(TvmCell) {
        TvmCell deployCode = buildTaskCode(code, repo, versionLib);
        return tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask, _goshdao: goshdao}});
    }  

    function composeBigTaskStateInit(TvmCell code, address goshdao, address repo, string nametask) public returns(TvmCell) {
        TvmCell deployCode = buildBigTaskCode(code, repo, versionLib);
        return tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask, _goshdao: goshdao}});
    }        

    function composeProfileDaoStateInit(TvmCell code, address versionController, string name) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: code,
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: versionController}
        });
        return s1;
    }

    function composeWalletStateInit(TvmCell code, address systemcontract, address goshdao, address pubaddr, uint128 index) public returns(TvmCell) {
        TvmCell deployCode = buildWalletCode(code, pubaddr, versionLib);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : systemcontract, _goshdao: goshdao, _index: index}
        });
        return _contract;
    }
    
    function composeTreeStateInit(TvmCell code, uint256 shainnertree, address repo) public returns(TvmCell) {
        TvmCell deployCode = buildTreeCode(code, versionLib);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaInnerTree: shainnertree, _repo: repo}});
        return stateInit;
    }

    function composeCommitStateInit(TvmCell code, string commit, address repo) public returns(TvmCell) {
        TvmCell deployCode = buildCommitCode(code, repo, versionLib);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: commit}});
        return stateInit;
    }

    function composeDiffStateInit(TvmCell code, string commit, address repo, uint128 index1, uint128 index2) public returns(TvmCell) {
        TvmCell deployCode = buildCommitCode(code, repo, versionLib);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});
        return stateInit;
    }

    
    function composeRepositoryStateInit(TvmCell code, address systemcontract, address goshdao, string name) public returns(TvmCell) {
        TvmCell deployCode = buildRepositoryCode(
            code, systemcontract, goshdao, versionLib
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: {_name: name}
        });
    }

    function composeGrantStateInit(TvmCell code, address goshdao, string name) public returns(TvmCell) {
        TvmCell deployCode = buildGrantsCode(
            code, goshdao, versionLib
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Grant,
            varInit: {_name: name, _goshdao: goshdao}
        });
    }

    function composeTopicStateInit(TvmCell code, address goshdao, string name, string content, address object) public returns(TvmCell) {
        TvmCell deployCode = buildTopicCode(
            code, goshdao, versionLib
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Topic,
            varInit: {_name: name, _content: content, _object: object}
        });
    }

    function composeCommentStateInit(TvmCell code, address goshdao, string name, string content, address object, optional(string) metadata, optional(string) commit, optional(string) nameoffile) public returns(TvmCell) {
        TvmCell deployCode = buildCommentCode(
            code, goshdao, object, commit, nameoffile, versionLib
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Topic,
            varInit: {_name: name, _content: content, _object: object, _metadata: metadata}
        });
    }

    function composeDaoStateInit(TvmCell code, address systemcontract, string name) public returns(TvmCell) {
        TvmCell deployCode = buildDaoCode(code, name, versionLib);
        return tvm.buildStateInit({
            code: deployCode,
            contr: GoshDao,
            varInit: { _systemcontract : systemcontract }
        });
    }

    function composeTagStateInit(TvmCell code, address repo, string nametag) public returns(TvmCell) {
        TvmCell deployCode = buildTagCode(code, repo, versionLib);
        return tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
    }

    function composeSystemContractStateInit(TvmCell code, uint256 pubkey) public returns(TvmCell) {
        return tvm.buildStateInit({
            code: code,
            contr: SystemContract,
            pubkey: pubkey,
            varInit: {}
        });
    }

    function composeProfileIndexStateInit(TvmCell code, address versionController, uint256 pubkey, string name) public returns(TvmCell) {
        return tvm.buildStateInit({
            code: buildProfileIndexCode(code, pubkey, versionController, "1.0.0"),
            contr: ProfileIndex,
            pubkey: tvm.pubkey(),
            varInit: { _name : name }
        });
    }

//Code Part
    function buildDaoCode(
        TvmCell originalCode, 
        string name, 
        string version) public returns(TvmCell) {
        TvmBuilder b;
        b.store(name);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildSignatureCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        b.store(repo);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildWalletCode(
        TvmCell originalCode,
        address pubaddr,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(pubaddr);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTokenWalletCode(
        TvmCell originalCode,
        address pubaddr,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(pubaddr);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildRepositoryCode(
        TvmCell originalCode,
        address goshaddr,
        address dao,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(goshaddr);
        b.store(dao);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTreeCode(
        TvmCell originalCode,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTaskCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildBigTaskCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildSnapshotCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildCommitCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildDiffCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTagCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildDaoTagCode(
        TvmCell originalCode,
        string tag,
        address versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(tag);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildRepoTagGoshCode(
        TvmCell originalCode,
        string tag,
        address versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("REPO");
        b.store(tag);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildRepoTagDaoCode(
        TvmCell originalCode,
        string tag,
        address dao,
        address versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("REPO");
        b.store(tag);
        b.store(dao);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTaskTagGoshCode(
        TvmCell originalCode,
        string tag,
        address versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("TASK");
        b.store(tag);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTaskTagDaoCode(
        TvmCell originalCode,
        string tag,
        address dao,
        address versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("TASK");
        b.store(tag);
        b.store(dao);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }    
    
    function buildTaskTagRepoCode(
        TvmCell originalCode,
        string tag,
        address dao,
        address repo,
        address versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("TASK");
        b.store(tag);
        b.store(dao);
        b.store(repo);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildProfileIndexCode(
        TvmCell originalCode,
        uint256 pubkey,
        address versioncontroller,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(pubkey);
        b.store(versioncontroller);
        b.store(version);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTopicCode(
        TvmCell originalCode,
        address dao,
        string versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("TOPIC");
        b.store(dao);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildCommentCode(
        TvmCell originalCode,
        address dao,
        address file,
        optional(string) commit,
        optional(string) name,
        string versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("COMMENT");
        b.store(dao);
        b.store(file);
        b.store(commit);
        b.store(name);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildGrantsCode(
        TvmCell originalCode,
        address dao,
        string versionc
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store("GRANT");
        b.store(dao);
        b.store(versionc);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
}
