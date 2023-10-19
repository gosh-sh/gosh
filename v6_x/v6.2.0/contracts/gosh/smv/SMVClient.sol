pragma ton-solidity >=0.54.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./Libraries/SMVErrors.sol";
import "./Libraries/SMVConstants.sol";

import "./Interfaces/ISMVTokenLocker.sol";
import "./Interfaces/ISMVClient.sol";
import "./Interfaces/ISMVProposal.sol";
import "./Interfaces/IVotingResultRecipient.sol";

import "./LockerPlatform.sol";
import "./LockableBase.sol";

contract SMVClient is LockableBase, ISMVClient , IVotingResultRecipient {

mapping (bool => uint128) votes;
uint32  propFinishTime;
address smvProposal;
bool    currentChoice;
uint128 currentAmount;
TvmCell currentCell;
uint128 total_votes;

modifier check_proposal {
  require ( msg.sender == smvProposal, SMVErrors.error_not_my_proposal) ;
  _ ;
}

function onCodeUpgrade (address goshdao,
                        uint256 _platform_id, 
                        uint128 amountToLock,
                        uint128 totalVotes, 
                        TvmCell staticCell, 
                        TvmCell inputCell) internal override
{
    tvm.resetStorage();
    _goshdao = goshdao;
    initialized = false;
    votes[true] = votes[false] = 0;
    delete leftBro;
    delete rightBro;
    delete rightAmount;
    delete currentHead;
    platform_id = _platform_id;
    total_votes = totalVotes;
    currentAmount = amountToLock;
    currentCell = inputCell;
    inserted = true;

    uint256 pid;

    ( , tokenLocker , pid, platformCodeHash, platformCodeDepth) = staticCell.toSlice().load(uint8, address, uint256, uint256, uint16);
    smvProposal = address.makeAddrStd(0, calcClientAddress(pid));

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
        _performAction();
    }
    else
    {
        optional (address) emptyAddress;
        optional (uint128) emptyValue;
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 128 + 32 } (platform_id, false, emptyAddress, emptyValue, true); //destroy
    }
}

function amount_locked () public view override  returns(uint128)
{
    return (votes[false] + votes[true]);
}

function _performAction () internal
{
    bool allowed = initialized && 
                   (block.timestamp < propFinishTime)  && 
                   (address(this).balance >= SMVConstants.CLIENT_MIN_BALANCE +
                                     SMVConstants.VOTING_FEE +
                                     SMVConstants.ACTION_FEE) && 
                   (currentAmount + amount_locked() <= total_votes) &&
                   inserted;                               
    
    if (!allowed) {
        optional (address) emptyAddress;
        optional (uint128) emptyValue; 
        if (amount_locked() >0 ){
            ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 64 } (platform_id, false, emptyAddress, emptyValue, false);
        } else
        {
            ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 128 + 32 } (platform_id, false, emptyAddress, emptyValue, true); //destroy
        }
    }
    else {
        tvm.accept();

        inserted = false;
        TvmSlice s = currentCell.toSlice();
        TvmSlice s1 = s.loadRefAsSlice();
        currentChoice = s1.load(bool);
        currentHead = s.load (optional (address));
        delete_and_do_action();
    }
} 

function performAction (uint128 amountToLock, uint128 total_votes_, TvmCell inputCell, address goshdao) external override check_locker
{
    _goshdao = goshdao;
    currentAmount = amountToLock;
    total_votes = total_votes_;
    currentCell = inputCell;
    _performAction();
}

function do_action () internal override
{
    ISMVProposal(smvProposal).vote {value: SMVConstants.PROPOSAL_VOTING_FEE, flag: 1 }
                                   (tokenLocker, platform_id, currentChoice, currentAmount) ;
}

function onProposalVoted (bool success) external override check_proposal
{
    tvm.accept();


    delete leftBro;
    delete rightBro;
    delete rightAmount;
    if (success) {
      votes[currentChoice] += currentAmount;
    }
    if (amount_locked() > 0 ) {
        if ((currentHead.hasValue()) && (currentHead.get()!=address(this))) {
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(currentHead.get()).insertClient {value:extra, flag:1} (platform_id, address(this), amount_locked());
         }
        else
        {
            inserted = true;
            //currentHead.set(address(this));
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, true, address(this), amount_locked(), false);
        }
    }
    else
    {
        optional (address) emptyAddress;
        optional (uint128) emptyValue;
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 128 + 32 } (platform_id, false, emptyAddress, emptyValue, true); //destroy
    }
    
/*     else {
        inserted = true;
        optional (address) emptyAddress;
        optional (uint128) emptyValue; 
        uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, false, emptyAddress, emptyValue, false);
 */    
}

function _getLockedAmount () public view returns(uint128)
{
     return (amount_locked());
}

function continueUpdateHead (uint256 _platform_id) external override check_client(_platform_id)
{
    delete leftBro;
    uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE , SMVConstants.ACTION_FEE);
    if (extra > SMVConstants.VOTING_COMPLETION_FEE)
        ISMVProposal(smvProposal).isCompleted {value: extra, 
                                               flag: 1+2/* , callback: SMVClient.onProposalCompletedWhileUpdateHead */} ();
    else
        ISMVTokenLocker(tokenLocker).onHeadUpdated {value:SMVConstants.EPSILON_FEE, flag:1} (platform_id, address(this), amount_locked());                                         
}


function isCompletedCallback (uint256 /* _platform_id */, 
                              optional (bool) completed, 
                              TvmCell /* data */ ) external  override  check_proposal
{   
    if (completed.hasValue())
    {
        ISMVTokenLocker(tokenLocker).onClientRemoved {value:SMVConstants.EPSILON_FEE, flag:1} (platform_id);
        if (rightBro.hasValue())
        {
            //uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(rightBro.get()).continueUpdateHead {value: 0, flag: 128+32} (platform_id);
            //selfdestruct(tokenLocker);
        }
        else
        {
            //uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            optional (address) emptyAddress;
            optional (uint128) emptyValue;
            ISMVTokenLocker(tokenLocker).onHeadUpdated {value:0, flag:128+32} (platform_id, emptyAddress, emptyValue);
        }
    }
    else
    {
        uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
        ISMVTokenLocker(tokenLocker).onHeadUpdated {value:extra, flag:1} (platform_id, address(this), amount_locked());
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

onBounce(TvmSlice body) external view {
    uint32 functionId = body.load(uint32);
    if (functionId == tvm.functionId(ISMVProposal.getInitialize)) 
    {
        optional (address) emptyAddress;
        optional (uint128) emptyValue;
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:0, flag: 128 + 32 } (platform_id, false, emptyAddress, emptyValue, true); //destroy
    }
}

}
