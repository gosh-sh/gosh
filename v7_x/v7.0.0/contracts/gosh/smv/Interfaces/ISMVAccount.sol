pragma ton-solidity >=0.54.0;

interface ISMVAccount {

function onLockerDeployed() external;
function acceptUnlock(uint128 amount) external;
function returnDAOBalance (uint128 amount) external;

}