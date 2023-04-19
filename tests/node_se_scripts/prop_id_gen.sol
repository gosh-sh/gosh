pragma ever-solidity >=0.5.0;
import "modifiers.sol";

contract TestAddress {

	uint256 constant SETCOMMIT_PROPOSAL_KIND = 1;
	uint256 constant ADD_PROTECTED_BRANCH_PROPOSAL_KIND = 2;
	uint256 constant DELETE_PROTECTED_BRANCH_PROPOSAL_KIND = 3;
	uint256 constant SET_TOMBSTONE_PROPOSAL_KIND = 4;
	uint256 constant DEPLOY_WALLET_DAO_PROPOSAL_KIND = 5;
	uint256 constant DELETE_WALLET_DAO_PROPOSAL_KIND = 6;
	uint256 constant SET_UPGRADE_PROPOSAL_KIND = 7;
	//    uint256 constant CHANGE_TOKEN_CONFIG_PROPOSAL_KIND = 8;
	//    uint256 constant TASK_PROPOSAL_KIND = 9;
	uint256 constant TASK_DESTROY_PROPOSAL_KIND = 10;
	uint256 constant TASK_DEPLOY_PROPOSAL_KIND = 11;
	uint256 constant DEPLOY_REPO_PROPOSAL_KIND = 12;
	uint256 constant ADD_VOTE_TOKEN_PROPOSAL_KIND = 13;
	uint256 constant ADD_REGULAR_TOKEN_PROPOSAL_KIND = 14;
	uint256 constant MINT_TOKEN_PROPOSAL_KIND = 15;
	uint256 constant DAOTAG_PROPOSAL_KIND = 16;
	uint256 constant DAOTAG_DESTROY_PROPOSAL_KIND = 17;
	uint256 constant ALLOW_MINT_PROPOSAL_KIND = 18;
	uint256 constant CHANGE_ALLOWANCE_PROPOSAL_KIND = 19;
	uint256 constant MULTI_PROPOSAL_KIND = 20;
	uint256 constant REPOTAG_PROPOSAL_KIND = 21;
	uint256 constant REPOTAG_DESTROY_PROPOSAL_KIND = 22;
	uint256 constant CHANGE_DESCRIPTION_PROPOSAL_KIND = 23;
	uint256 constant CHANGE_ALLOW_DISCUSSION_PROPOSAL_KIND = 24;
	uint256 constant CHANGE_HIDE_VOTING_PROPOSAL_KIND = 25;
	uint256 constant TAG_UPGRADE_PROPOSAL_KIND = 26;
	uint256 constant ABILITY_INVITE_PROPOSAL_KIND = 27;
	uint256 constant UPGRADE_CODE_PROPOSAL_KIND = 32;

	uint128 constant ALONE_DEPLOY_WALLET = 1;
	uint128 constant ALONE_SET_CONFIG = 2;
	uint128 constant ALONE_DEPLOY_REPO = 3;
	uint128 constant ALONE_ADD_TOKEN = 4;
	uint128 constant ALONE_ADD_VOTE_TOKEN = 5;
	uint128 constant ALONE_MINT_TOKEN = 6;
	uint128 constant ALONE_DAOTAG = 7;
	uint128 constant ALONE_DAOTAG_DESTROY = 8;
	uint128 constant ALONE_ALLOW_MINT = 9;

	function get_upgrade_prop_id(string newversion, string description) public pure returns (uint256) {
		TvmBuilder proposalBuilder;
		uint256 proposalKind = SET_UPGRADE_PROPOSAL_KIND;
		proposalBuilder.store(proposalKind, newversion, description);
		TvmCell c = proposalBuilder.toCell();
		
		uint256 hash = tvm.hash(c);
		require(hash != 0);
		return hash;
	}
	
	function get_upgrade_prop_id_2(string newversion, string description, string comment, uint32 _now) public pure returns (uint256) {
		TvmBuilder proposalBuilder;
		uint256 proposalKind = SET_UPGRADE_PROPOSAL_KIND;
		proposalBuilder.store(proposalKind, newversion, description, comment, _now);
		TvmCell c = proposalBuilder.toCell();
		
		uint256 hash = tvm.hash(c);
		require(hash != 0);
		return hash;
	}
	
	function get_add_protected_prop_id(
		string repoName,
		string branchName,
		uint32 _now
	) public pure returns (uint256) {
		TvmBuilder proposalBuilder;
		uint256 proposalKind = ADD_PROTECTED_BRANCH_PROPOSAL_KIND;
		proposalBuilder.store(proposalKind, repoName, branchName, _now);
		TvmCell c = proposalBuilder.toCell();
		
		uint256 hash = tvm.hash(c);
		require(hash != 0);
		return hash;
	}
	
	function get_set_commit_prop_id(
		string repoName,
		string branchName,
		string commit,
		uint128 numberChangedFiles,
		uint128 numberCommits
	) public pure returns (uint256) {
		TvmBuilder proposalBuilder;
		uint256 proposalKind = SETCOMMIT_PROPOSAL_KIND;
		proposalBuilder.store(proposalKind, repoName, branchName, commit, numberChangedFiles, numberCommits);
		TvmCell c = proposalBuilder.toCell();
		
		uint256 hash = tvm.hash(c);
		require(hash != 0);
		return hash;
	}
	
	function getHash(TvmCell data) pure public returns (uint256) {
		uint256 hash = tvm.hash(data);
		require(hash != 0);
		return hash;
	}
	
	function unzip(bytes data) pure public {
		optional(string) res = gosh.unzip(data);
		require(res.hasValue());
	}

	function getCellTaskDeploy(
		string taskName,
		string repoName,
		uint32 _now
	) external pure returns(uint256) {
		uint256 proposalKind = TASK_DEPLOY_PROPOSAL_KIND;
		string[] tag;
		ConfigPair[] assign;
		assign.push(ConfigPair(1,1));
		assign.push(ConfigPair(1,100));
		ConfigGrant grant;
		grant.assign = assign;
		string comment;
		return tvm.hash(abi.encode(proposalKind, repoName, taskName, tag, grant, comment, _now));
	}

	function getMultiProposal(
		uint128 number,
		TvmCell proposals,
		uint32 _now
	) external pure returns(uint256) {
		uint256 proposalKind = MULTI_PROPOSAL_KIND;
		TvmCell c = abi.encode(proposalKind, number, proposals, _now);
		return tvm.hash(c);
	}

	function getCellForUpgradeVC(
		TvmCell UpgradeCode,
		TvmCell cell,
		string comment,
		uint32 _now
	) public pure returns (uint256) {
		uint256 proposalKind = UPGRADE_CODE_PROPOSAL_KIND;
		TvmCell c = abi.encode(proposalKind, UpgradeCode, cell, comment, _now);
		return tvm.hash(c);
	}
}
