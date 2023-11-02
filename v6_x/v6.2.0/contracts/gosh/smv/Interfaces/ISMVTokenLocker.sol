pragma ton-solidity >=0.54.0;

interface ISMVTokenLocker {

function unlockVoting(/* address wallet_to, */ uint128 amount) external;
function onClientCompleted(uint256 _platform_id, bool success, optional (address) newClientHead, optional (uint128) newHeadValue, bool isDead) external;
function onClientRemoved (uint256 _platform_id) external;

function startPlatform(TvmCell platformCode, TvmCell clientCode, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell, uint128 deployFee, address goshdao, string[] isTag, address pubaddr) external;                     
//function onInitialized(uint256 _platform_id, uint128 actionValue, uint128 actionLockAmount, TvmCell actionInputCell) external;
function onClientInserted (uint256 _platform_id) external;
function onHeadUpdated(uint256 _platform_id, optional (address) newClientHead, optional (uint128) newHeadValue) external;
function updateHead() external;
function returnAllButInitBalance() external;
//function lockVoting(uint128) external;

}
