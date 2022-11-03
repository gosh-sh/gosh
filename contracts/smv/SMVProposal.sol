pragma ton-solidity >=0.54.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
import "External/tip3/interfaces/ITokenRoot.sol";

import "Interfaces/ISMVClient.sol";
import "Interfaces/ISMVProposal.sol";
import "Interfaces/IVotingResultRecipient.sol";

import "LockableBase.sol";

abstract contract SMVProposalBase is LockableBase, ISMVProposal  {

uint256 public propId;
uint32  creationTime;
address public tokenRoot;

TvmCell propData;
uint32 public startTime;
uint32 public finishTime;
address public ownerAddress;

uint128 public votesYes;
uint128 public votesNo;
optional (bool) public votingResult;
uint128 public amountLocked;
uint128 public totalSupply;
//bool public proposalBusy;
//uint128 total_votes;
uint32 public realFinishTime;

function amount_locked () public override view returns(uint128)
{
    return amountLocked;
}

function calcExternalClientAddress (address /* _tokenLocker */, uint256 _platform_id) internal view returns(uint256)
{
    TvmCell dataCell = tvm.buildDataInit ( {contr:LockerPlatform,
                                            varInit:{
                                                /* tokenLocker: _tokenLocker, */
                                                platform_id: _platform_id } } );
    uint256 dataHash = tvm.hash (dataCell);
    uint16 dataDepth = dataCell.depth();

    uint256 add_std_address = tvm.stateInitHash (platformCodeHash, dataHash , platformCodeDepth, dataDepth);
    return add_std_address ;
}

modifier check_external_client (address _tokenLocker, uint256 _platform_id) {
    uint256 expected = calcExternalClientAddress (_tokenLocker, _platform_id);
    require ( msg.sender.value == expected, SMVErrors.error_not_my_external_client) ;
    _ ;
}

modifier check_token_root {
    require ( msg.sender == tokenRoot, SMVErrors.error_not_my_token_root) ;
    _ ;
}

function onCodeUpgrade (uint256 _platform_id,
                        uint128 amountToLock,
                        uint128 /* totalVotes */,
                        TvmCell staticCell,
                        TvmCell inputCell) internal override
{
    tvm.resetStorage();

    initialized = true;
    votingResult.reset();
    leftBro.reset();
    rightBro.reset();
    rightAmount.reset();
    currentHead.reset();
    platform_id = _platform_id;
    amountLocked = amountToLock;
    //proposalBusy = false;
    //total_votes = totalVotes;

    ( , tokenLocker , propId, platformCodeHash, platformCodeDepth) = staticCell.toSlice().decode(uint8, address, uint256, uint256, uint16);

    TvmSlice s = inputCell.toSlice();
    TvmSlice s1 = s.loadRefAsSlice(); //inputCell+currentHead

    propData = s1.loadRef();
    TvmSlice s12 = s1.loadRefAsSlice();
    (startTime, finishTime, ownerAddress, tokenRoot) = s12.decode(uint32, uint32, address, address);
    realFinishTime = finishTime;
    currentHead = s.decode(optional(address));

    uint128 extra = 0;
    if (address(this).balance > SMVConstants.PROPOSAL_INIT_VALUE)
        {extra = address(this).balance - SMVConstants.PROPOSAL_INIT_VALUE;}

    if (extra == 0)
    {
        optional (address) emptyAddress;
        optional (uint128) emptyValue;
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag:128+32} (platform_id, false, emptyAddress, emptyValue, true);
    }
    else
    {
        //ISMVTokenLocker(tokenLocker).onInitialized {value: SMVConstants.EPSILON_FEE, flag: 1} (platform_id);
        delete_and_do_action();
    }
}

function onContinueAction(uint128 t) external check_token_root
{
    totalSupply = t;

    leftBro.reset();
    rightBro.reset();
    rightAmount.reset();

    if ((currentHead.hasValue()) && (currentHead.get()!=address(this))) {
        uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE, SMVConstants.ACTION_FEE);
        LockableBase(currentHead.get()).insertClient {value:extra, flag:1} (platform_id, address(this), amount_locked());
    }
    else
    {
        //currentHead.set(address(this));
        uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE, SMVConstants.ACTION_FEE);
        ISMVTokenLocker(tokenLocker).onClientCompleted {value: extra, flag:1} (platform_id, true, address(this), amount_locked(), false);
    }
}

function do_action() internal override
{
    ITokenRoot(tokenRoot).totalSupply {value: SMVConstants.ACTION_FEE, flag: 1, callback:SMVProposalBase.onContinueAction} ();
}

//this prevents hang when creating the same proposal
function performAction (uint128 /* amountToLock */, uint128 /* total_votes */, TvmCell /* inputCell */) external override check_locker
{
    optional (address) emptyAddress;
    optional (uint128) emptyValue;
    uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE , SMVConstants.ACTION_FEE);
    ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, false, emptyAddress, emptyValue, false);
}

function getInitialize(address _tokenLocker, uint256 _platform_id) external override check_external_client(_tokenLocker, _platform_id)
{
    require(msg.value >= SMVConstants.PROP_INITIALIZE_FEE, SMVErrors.error_balance_too_low);
    //require(!proposalBusy, SMVErrors.proposal_is_busy);
    tvm.accept();

    bool allowed = //(!proposalBusy) &&
                   (now >= startTime) &&  (now < finishTime) && (!votingResult.hasValue());

    if (!allowed)
        ISMVClient(msg.sender).initialize {value:0, flag: 64} (false, finishTime);
    else {
        tryEarlyComplete(totalSupply);
        /* bool  */allowed = !votingResult.hasValue();
        if (!allowed)
        {
            IVotingResultRecipient(ownerAddress).isCompletedCallback {value:SMVConstants.EPSILON_FEE, flag: 1} (platform_id, votingResult, propData);
        }
        ISMVClient(msg.sender).initialize {value:0, flag: 64} (allowed, finishTime);
    }
}

function vote (address _locker, uint256 _platform_id, bool choice, uint128 amount) external override check_external_client(_locker,_platform_id)
{
    require(msg.value >= SMVConstants.PROPOSAL_VOTING_FEE, SMVErrors.error_balance_too_low);

    tvm.accept();

    if (/* (proposalBusy) || */ (now < startTime) || (now >= finishTime) || (votingResult.hasValue()) )
        //return {value:0, flag: 64} false;
        ISMVClient(msg.sender).onProposalVoted {value:0, flag: 64} (false);
    else {
//        tryEarlyComplete(totalSupply);

        if (votingResult.hasValue())
            ISMVClient(msg.sender).onProposalVoted {value:0, flag: 64} (false);
        else
        {
            if (choice)
                votesYes += amount;
            else
                votesNo += amount;
            tryEarlyComplete(totalSupply);
            if (votingResult.hasValue())
            {
                IVotingResultRecipient(ownerAddress).isCompletedCallback {value:SMVConstants.EPSILON_FEE, flag: 1} (platform_id, votingResult, propData);
            }
            ISMVClient(msg.sender).onProposalVoted {value:0, flag: 64} (true);
        }
    }
}

function completeVoting() internal
{
    if ((address(this).balance > SMVConstants.PROPOSAL_MIN_BALANCE + SMVConstants.VOTING_COMPLETION_FEE) &&
        (now >= startTime) &&
        (!votingResult.hasValue())/* || (proposalBusy) */)
    {
        if (now < finishTime)
            tryEarlyComplete(totalSupply);
        else
            calcVotingResult(totalSupply);
    }
}

function isCompleted () override public
{
    require (msg.value > SMVConstants.EPSILON_FEE, SMVErrors.error_balance_too_low);

    completeVoting();
    IVotingResultRecipient(msg.sender).isCompletedCallback {value:0, flag: 64} (platform_id, votingResult, propData);
}

function _isCompleted () public view returns (optional (bool))
{
    return votingResult;
}





//gosh only
//b.store(proposalKind, repoName, branchName, commitName, fullCommit, parent1, parent2);
function getGoshSetCommitProposalParams () external view
         returns( uint256  proposalKind,  string repoName, string  branchName,  string commit)
{
    TvmSlice s = propData.toSlice();
    (proposalKind,  repoName,  branchName,  commit) = s.decode(uint256, string, string, string);
}

function getGoshAddProtectedBranchProposalParams () external view
         returns( uint256  proposalKind,  string repoName, string  branchName)
{
    TvmSlice s = propData.toSlice();
    (proposalKind,  repoName,  branchName) = s.decode(uint256, string, string);
}

function getGoshDeleteProtectedBranchProposalParams () external view
         returns( uint256  proposalKind,  string repoName, string  branchName)
{
    TvmSlice s = propData.toSlice();
    (proposalKind,  repoName,  branchName) = s.decode(uint256, string, string);
}

function getGoshDeployWalletDaoProposalParams () external view
         returns( uint256  proposalKind, address[] pubaddr)
{
    TvmSlice s = propData.toSlice();
    (proposalKind, pubaddr) = s.decode(uint256, address[]);
}

function getGoshDeleteWalletDaoProposalParams () external view
         returns( uint256  proposalKind, address[] pubaddr)
{
    TvmSlice s = propData.toSlice();
    (proposalKind, pubaddr) = s.decode(uint256, address[]);
}


////////////////////////////////////

function tryEarlyComplete (uint128 t) internal virtual {}
function calcVotingResult (uint128 t) internal virtual {}

function continueUpdateHead (uint256 _platform_id) external override check_client(_platform_id)
{
     leftBro.reset();
/*    uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE , SMVConstants.ACTION_FEE);

    if (extra > SMVConstants.VOTING_COMPLETION_FEE)
        ISMVProposal(address(this)).isCompleted {value: extra, flag: 1+2} ();
    else
        ISMVTokenLocker(tokenLocker).onHeadUpdated {value:SMVConstants.EPSILON_FEE, flag:1} (platform_id, address(this), amount_locked());
 */
    completeVoting();
    continueUpdateHeadHere();

}


/* function onProposalCompletedWhileUpdateHead (optional (bool) completed) external check_myself */
function continueUpdateHeadHere () internal view
{
    if (votingResult.hasValue())
    {
        ISMVTokenLocker(tokenLocker).onClientRemoved {value:SMVConstants.EPSILON_FEE, flag:1} (platform_id);
        if (rightBro.hasValue())
        {
            uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(rightBro.get()).continueUpdateHead {value: extra, flag: 1} (platform_id);
            //selfdestruct(smvAccount);
        }
        else
        {
            uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE, SMVConstants.ACTION_FEE);
            optional (address) emptyAddress;
            optional (uint128) emptyValue;
            ISMVTokenLocker(tokenLocker).onHeadUpdated {value:extra, flag:1} (platform_id, emptyAddress, emptyValue);
        }
    }
    else
    {
        uint128 extra = _reserve (SMVConstants.PROPOSAL_MIN_BALANCE, SMVConstants.ACTION_FEE);
        ISMVTokenLocker(tokenLocker).onHeadUpdated {value:extra, flag:1} (platform_id, address(this), amount_locked());
    }
}

function updateHead() external override check_locker()
{
    require(isHead(), SMVErrors.error_i_am_not_head);
    require(address(this).balance >= SMVConstants.PROPOSAL_MIN_BALANCE +
                                     SMVConstants.VOTING_COMPLETION_FEE +
                                     2*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);

    completeVoting();
    continueUpdateHeadHere();
}

}

contract SMVProposal is SMVProposalBase {

function tryEarlyComplete (uint128 t) internal override
{
  uint128 y = votesYes;
  uint128 n = votesNo;
  if (2 * y > t) {
    votingResult.set(true) ;
    realFinishTime = now;
  } else
    if (2 * n > t) {
        votingResult.set(false) ;
        realFinishTime = now;
    }
}

function calcVotingResult (uint128 t) internal override
{
    uint128 y = votesYes;
    uint128 n = votesNo;
    votingResult.set(y >= 1 + (t/10) + ((n*((t/2)-(t/10)))/(t/2)));
}

}
