pragma ton-solidity >=0.54.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
import "Libraries/SMVConstants.sol";

import "Interfaces/ISMVTokenLocker.sol";
import "Interfaces/ISMVClient.sol";
import "Interfaces/ISMVProposal.sol";
import "Interfaces/IVotingResultRecipient.sol";

import "LockerPlatform.sol";
import "LockableBase.sol";

contract SMVClient is LockableBase, ISMVClient , IVotingResultRecipient {

mapping (bool => uint128) votes;
uint32 propFinishTime;

address smvProposal;
bool currentChoice;
uint128 currentAmount;

modifier check_proposal {
  require ( msg.sender == smvProposal, SMVErrors.error_not_my_proposal) ;
  _ ;
}

function onCodeUpgrade (uint256 _platform_id, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell) internal override
{
    amountToLock; inputCell;
    tvm.resetStorage();

    initialized = false;
    votes[true] = votes[false] = 0;
    leftBro.reset();
    rightBro.reset();
    currentHead.reset();
    platform_id = _platform_id;

    ( , tokenLocker , smvProposal, platformCodeHash, platformCodeDepth) = staticCell.toSlice().decode(uint8, address, address, uint256, uint16);

    ISMVProposal(smvProposal).getInitialize {value: SMVConstants.PROP_INITIALIZE_FEE + SMVConstants.ACTION_FEE, flag: 1}
                                            (tokenLocker, platform_id);
}

function initialize (bool success, uint32 finishTime) external override check_proposal
{
    require (!initialized, SMVErrors.error_already_initialized);
    tvm.accept();

    if (success)
    {
        propFinishTime = finishTime;
        initialized = true;
        ISMVTokenLocker(tokenLocker).onInitialized {value: SMVConstants.EPSILON_FEE, flag: 1} (platform_id);
    }
    else
    {
        optional (address) empty;
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 128 + 32 } (platform_id, false, empty); //destroy
    }
}

function amount_locked () internal view override  returns(uint128)
{
    return (votes[false] + votes[true]);
}

function performAction (uint128 amountToLock, uint128 total_votes, TvmCell inputCell) external override check_locker
{
    /* require(initialized, SMVErrors.error_not_initialized);
    require(now < propFinishTime, SMVErrors.error_proposal_ended);
    require(address(this).balance >= SMVConstants.CLIENT_MIN_BALANCE +
                                     SMVConstants.VOTING_FEE +
                                     SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(amountToLock + amount_locked() <= total_votes, SMVErrors.error_not_enough_votes);  */ 

    bool allowed = initialized && (now < propFinishTime)  && (address(this).balance >= SMVConstants.CLIENT_MIN_BALANCE +
                                     SMVConstants.VOTING_FEE +
                                     SMVConstants.ACTION_FEE) && (amountToLock + amount_locked() <= total_votes);

    optional (address) empty;
    
    if (!allowed) 
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 64 } (platform_id, false, empty);
    else {
        tvm.accept();

        TvmSlice s = inputCell.toSlice();
        TvmSlice s1 = s.loadRefAsSlice();
        bool choice = s1.decode(bool);
        currentHead = s.decode (optional (address));

        vote(choice, amountToLock);
    }
}

function continueLeftBro() private view
{
    if (!isTail())
    {
        LockableBase(rightBro.get()).setLeftBro {value: SMVConstants.ACTION_FEE, flag: 1, callback: SMVClient.onSetLeftBro} (platform_id, leftBro);
    }
    else sendVote();
}

function onSetRightBro (uint256 _platform_id) external view check_client(_platform_id)
{
    continueLeftBro();
}

function onSetLeftBro (uint256 _platform_id) external view check_client(_platform_id)
{
    sendVote();
}

function vote (bool choice, uint128 amount) private
{
    currentChoice = choice;
    currentAmount = amount;

    if (!isHead())
    {
        LockableBase(leftBro.get()).setRightBro {value: SMVConstants.ACTION_FEE, flag: 1, callback: SMVClient.onSetRightBro} (platform_id, rightBro);
    }
    else continueLeftBro();

}

function sendVote () internal view
{
    ISMVProposal(smvProposal).vote {value: SMVConstants.PROPOSAL_VOTING_FEE, flag: 1 }
                                   (tokenLocker, platform_id, currentChoice, currentAmount) ;
}

function onProposalVoted (bool success) external override check_proposal
{
    tvm.accept();

    if (success) {

      leftBro.reset();
      rightBro.reset();
      votes[currentChoice] += currentAmount;

      if ((currentHead.hasValue()) && (currentHead.get()!=address(this))) {
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(currentHead.get()).insertClient {value:extra, flag:1} (platform_id, address(this), amount_locked());
      }
      else
      {
            currentHead.set(address(this));
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, true, address(this));
      }
    }
    else
    {
      optional (address) empty;
      uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
      ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, false, empty);
    }
}

function _getLockedAmount () public view returns(uint128)
{
     return (amount_locked());
}

function continueUpdateHead (uint256 _platform_id) external override check_client(_platform_id)
{
    leftBro.reset();
    uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE , SMVConstants.ACTION_FEE);
    if (extra > SMVConstants.VOTING_COMPLETION_FEE)
        ISMVProposal(smvProposal).isCompleted {value: extra, 
                                               flag: 1+2/* , callback: SMVClient.onProposalCompletedWhileUpdateHead */} ();
    else
        ISMVTokenLocker(tokenLocker).onHeadUpdated {value:SMVConstants.EPSILON_FEE, flag:1} (platform_id, address(this));                                         
}


function isCompletedCallback (uint256 /* _platform_id */, address /* _tokenLocker */, optional (bool) completed, TvmCell /* data */ ) external override check_proposal
{   
    if (completed.hasValue())
    {
        if (rightBro.hasValue())
        {
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(rightBro.get()).continueUpdateHead {value: extra, flag: 1} (platform_id);
            selfdestruct(tokenLocker);
        }
        else
        {
            //uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            optional (address) empty;
            ISMVTokenLocker(tokenLocker).onHeadUpdated {value:0, flag:128+32} (platform_id, empty);
        }
    }
    else
    {
        uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
        ISMVTokenLocker(tokenLocker).onHeadUpdated {value:extra, flag:1} (platform_id, address(this));
    }
}

function updateHead() external override check_locker()
{
    require(isHead(), SMVErrors.error_i_am_not_head);
    require(address(this).balance >= SMVConstants.CLIENT_MIN_BALANCE + 
                                     SMVConstants.VOTING_COMPLETION_FEE +                              
                                     2*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    ISMVProposal(smvProposal).isCompleted {value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.ACTION_FEE, 
                                           flag: 1/* , 
                                           callback: SMVClient.onProposalCompletedWhileUpdateHead */} ();

}



}