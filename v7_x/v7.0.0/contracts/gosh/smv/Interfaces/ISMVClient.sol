pragma ton-solidity >=0.54.0;

interface ISMVClient {

/* function vote (optional (address) clientHead, bool choice, uint128 amount) external;
function insertClient (address proposal, address newClient, uint128 amount) external;
function onClientInserted (address proposal, optional (address) newClientHead, 
                           optional (address) leftClient, optional (address) rightClient) external;
function onRightClientInserted (address proposal, address newClient) external;  */
function initialize (bool success, uint32 finishTime) external;

/* function setRightBro (address proposal, optional (address) rb) external  responsible  returns(bool) ;
function setLeftBro (address proposal, optional (address) lb) external responsible returns(bool);
function getLockedAmount () external view override responsible returns(uint128) */

function onProposalVoted (bool success) external;

}