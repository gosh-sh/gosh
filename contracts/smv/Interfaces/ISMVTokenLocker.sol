pragma ton-solidity >=0.54.0;

interface ISMVTokenLocker {

/* function voteFor (TvmCell clientCode, address proposal, bool choice, uint128 amount) external; */
function unlockVoting (/* address wallet_to, */ uint128 amount) external;
function onClientCompleted (uint256 _platform_id, bool success, optional (address) newClientHead) external;
//function onLockAmountUpdate (address proposal, uint128 amount) external;
/* function startProposal (TvmCell proposalCode, uint256 propId, TvmCell propData, 
                        uint32 startTime, uint32 finishTime) external; */

function startPlatform (TvmCell platformCode, TvmCell clientCode, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell, uint128 deployFee) external;                     
function onInitialized(uint256 _platform_id) external;
function onHeadUpdated (uint256 _platform_id, optional (address) newClientHead) external;
function updateHead() external;

}