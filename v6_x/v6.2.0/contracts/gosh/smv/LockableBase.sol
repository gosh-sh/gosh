pragma ton-solidity >=0.54.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./Libraries/SMVErrors.sol";
import "./Libraries/SMVConstants.sol";

import "./Interfaces/ISMVTokenLocker.sol";
import "./Interfaces/ISMVClient.sol";
import "./Interfaces/ISMVProposal.sol";

import "./LockerPlatform.sol";

abstract contract LockableBase {

//init data from LockerPlatform
address public /* static */ tokenLocker;
uint256 public static platform_id;
//uint128 public votesYes;  //for testing
//uint128 public votesNo;     //for testing
//optional (bool) public votingResult;    //for testing


//LockableBase data
bool _isTag;
address _goshdao;
address _pubaddr;
uint256 platformCodeHash;
uint16 platformCodeDepth;
optional (address) public leftBro;
optional (address) public rightBro;
optional (uint128) public rightAmount;
optional (address) currentHead;
bool public initialized;
bool public inserted;

function calcClientAddress (uint256 _platform_id) internal view returns(uint256)
{
  TvmCell dataCell = tvm.buildDataInit ( {contr:LockerPlatform,
                                          varInit:{
                                             /* tokenLocker: tokenLocker, */
                                             platform_id: _platform_id } } );
  uint256 dataHash = tvm.hash (dataCell);
  uint16 dataDepth = dataCell.depth();

  uint256 add_std_address = tvm.stateInitHash (platformCodeHash, dataHash , platformCodeDepth, dataDepth);
  return add_std_address ;
}

modifier check_client (uint256 _platform_id) {
  uint256 expected = calcClientAddress (_platform_id);
  require ( msg.sender.value == expected, SMVErrors.error_not_my_client) ;
  _ ;
}

modifier check_myself {
  require ( msg.sender == address(this), SMVErrors.error_not_my_myself) ;
  _ ;
}

modifier check_locker {
  require ( msg.sender == tokenLocker, SMVErrors.error_not_my_locker) ;
  _ ;
}

function isHead () inline internal view returns (bool)
{
  return (!leftBro.hasValue());
}

function isTail () inline internal view returns (bool)
{
  return (!rightBro.hasValue());
}

function setRightBro (uint256 _platform_id, 
                      optional (address) rb, 
                      optional (uint128) ra) external  responsible check_client(_platform_id) returns(uint256)
{
    tvm.accept();
    rightBro = rb;
    rightAmount = ra;
    return {value: 0, bounce: true, flag: 64} platform_id;
}

function setLeftBro (uint256 _platform_id, optional (address) lb) external  responsible check_client(_platform_id) returns(uint256)
{
    tvm.accept();
    leftBro = lb;
    return {value: 0, bounce: true, flag: 64} platform_id;
}

function onClientInserted (uint256 _platform_id, 
                           optional (address) leftClient, optional (address) rightClient, 
                           optional (uint128) rightAmount_)
                           external
                           check_client(_platform_id)
{
    //require(initialized, SMVErrors.error_not_initialized);
    //new head is set, left client is not set, but new head is not this
    //bool int_error1 = newClientHead.hasValue() && (!leftClient.hasValue()) && (newClientHead.get() != address(this));
    //new head is set, left client is set, but new head is this
    //bool int_error2 = newClientHead.hasValue() && leftClient.hasValue() && (newClientHead.get() == address(this));
    //currrentHead is not set and new head is not set
    //bool int_error3 = (!currentHead.hasValue()) && (!newClientHead.hasValue());

    inserted = true;

/*     if (int_error1 || int_error2 || int_error3)
    {
        optional (address) empty;

        uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
        tokenLocker.transfer(extra, true, 1);
        //ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, false, empty);
    }
    else
    { */

    leftBro = leftClient;
    rightBro = rightClient;
    rightAmount = rightAmount_;

    uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
    ISMVTokenLocker(tokenLocker).onClientInserted {value:extra, flag:1} (platform_id);
      //ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, true, newClientHead);
    //}
}

function nothing (uint256 _platform_id) external check_client(_platform_id) {}

function insertClient (uint256 _platform_id, address newClient, uint128 amount) external  check_client(_platform_id)
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance  > SMVConstants.CLIENT_MIN_BALANCE+3*SMVConstants.ACTION_FEE, 1000);
    tvm.accept();

    if (amount < amount_locked())
    {
        optional (address) emptyAddress;
        optional (uint128) emptyValue;
        uint128 extra;
        if (isTail())
        {
            rightBro.set(newClient);
            rightAmount.set(amount);
            if (isHead())
                extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE + 2*SMVConstants.ACTION_FEE, 2*SMVConstants.ACTION_FEE);
            else
                extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE , SMVConstants.ACTION_FEE);
            LockableBase(newClient).onClientInserted {value:extra, flag:1} (platform_id, /* emptyAddress, */ address(this), emptyAddress, emptyValue);
        }
        else
        {
            if (amount < rightAmount.get())
            {
                if (isHead())
                    extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE+2*SMVConstants.ACTION_FEE, 2*SMVConstants.ACTION_FEE);
                else
                    extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
                LockableBase(rightBro.get()).insertClient {value:extra, flag:1+2} (platform_id, newClient, amount);
            }
            else
            {   
                //extra = 2*SMVConstants.ACTION_FEE;
                LockableBase(rightBro.get()).setLeftBro {value: SMVConstants.ACTION_FEE, 
                                                         flag: 1, 
                                                         callback: LockableBase.nothing} (platform_id, newClient);
                extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE + 2*SMVConstants.ACTION_FEE, SMVConstants.ACTION_FEE) /* - SMVConstants.ACTION_FEE */;
                //optional (address) emptyAddress;
                LockableBase(newClient).onClientInserted {value:extra, flag:1} (platform_id, /* emptyAddress, */ address(this), rightBro, rightAmount);
                rightBro.set(newClient);
                rightAmount.set(amount);
                //extra += 2*SMVConstants.ACTION_FEE;
            }
        }
        if (isHead())
        {
            require(_reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE)  > extra, 5000);
            extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE)  - extra ;
            ISMVTokenLocker(tokenLocker).onClientCompleted {value:   extra , flag:1} (platform_id, true, emptyAddress, emptyValue, false);
        }
    }
    else
    {
        if (isHead())
        {
            leftBro.set(newClient);
            optional (address) empty;
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE+SMVConstants.ACTION_FEE, SMVConstants.ACTION_FEE);
            LockableBase(newClient).onClientInserted {value:SMVConstants.ACTION_FEE, flag:1} (platform_id, /* newClient, */ empty, address(this), amount_locked());
            ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, true, newClient, amount, false);
        }
        else
        {
            revert(); //internal error
            /* uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(leftBro.get()).onRightClientInserted {value:extra, flag:1} (platform_id, newClient, amount);
            leftBro.set(newClient); */
        }
    }
}

function _reserve(uint128 min, uint128 def) internal pure returns(uint128)
{
    uint128 extra = 0;
    if (address(this).balance > min)
        extra = address(this).balance - min;
    if (extra == 0)
        extra = def;
    return extra;    
}

/* function onRightClientInserted (uint256 _platform_id, address newClient, uint128 amount) external  check_client(_platform_id)
{
    require(initialized, SMVErrors.error_not_initialized);
    require(rightBro.hasValue(), SMVErrors.error_no_right_bro);
    require(msg.sender == rightBro.get(), SMVErrors.error_not_right_bro);
    tvm.accept();

    uint128 rightAmount_ = rightAmount.get();
    rightBro.set(newClient);
    rightAmount.set(amount);
    optional (address) empty;
    //reserveInitValue();

    uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
    LockableBase(newClient).onClientInserted {value:extra, flag:1} (platform_id, empty, address(this), msg.sender, rightAmount_);
} */

function amount_locked () virtual public view returns(uint128);
function performAction (uint128 amountToLock, uint128 total_votes, TvmCell inputCell, address goshdao) virtual external;
function onCodeUpgrade (bool isTag,
                        address pubaddr,
                        address goshdao,
                        uint256 _platform_id, 
                        uint128 amountToLock,
                        uint128 totalVotes, 
                        TvmCell staticCell, 
                        TvmCell inputCell) virtual internal;


function getLockedAmount () external view  responsible returns(uint128)
{
    require(msg.value >= SMVConstants.EPSILON_FEE, SMVErrors.error_balance_too_low);

    return {value:0, bounce: true, flag: 64} (amount_locked());
}


function continueUpdateHead (uint256 _platform_id) virtual external;
function updateHead() virtual external;
function do_action() virtual internal;

function delete_and_do_action() internal
{
    if (!isHead())
    {
        LockableBase(leftBro.get()).setRightBro {value: SMVConstants.ACTION_FEE, flag: 1, callback: LockableBase.onSetRightBro} (platform_id, rightBro, rightAmount);
    }
    else continueLeftBro();
}

function continueLeftBro() private
{
    if (!isTail())
    {
        LockableBase(rightBro.get()).setLeftBro {value: SMVConstants.ACTION_FEE, flag: 1, callback: LockableBase.onSetLeftBro} (platform_id, leftBro);
    }
    else do_action();
}

function onSetRightBro (uint256 _platform_id) external check_client(_platform_id)
{
    continueLeftBro();
}

function onSetLeftBro (uint256 _platform_id) external check_client(_platform_id)
{
    do_action();
}

}
