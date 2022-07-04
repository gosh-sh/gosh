pragma ton-solidity >=0.54.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
import "Libraries/SMVConstants.sol";

import "Interfaces/ISMVTokenLocker.sol";
import "Interfaces/ISMVClient.sol";
import "Interfaces/ISMVProposal.sol";

import "LockerPlatform.sol";

abstract contract LockableBase {

//init data from LockerPlatform
address public static tokenLocker;
uint256 public static platform_id;

//LockableBase data
uint256 platformCodeHash;
uint16 platformCodeDepth;
optional (address) public leftBro;
optional (address) public rightBro;
optional (address) currentHead;
bool public initialized;

function calcClientAddress (uint256 _platform_id) internal view returns(uint256)
{
  TvmCell dataCell = tvm.buildDataInit ( {contr:LockerPlatform,
                                          varInit:{
                                             tokenLocker: tokenLocker,
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

function setRightBro (uint256 _platform_id, optional (address) rb) external  responsible check_client(_platform_id) returns(uint256)
{
    tvm.accept();
    rightBro = rb;
    return {value: 0, bounce: true, flag: 64} platform_id;
}

function setLeftBro (uint256 _platform_id, optional (address) lb) external  responsible check_client(_platform_id) returns(uint256)
{
    tvm.accept();
    leftBro = lb;
    return {value: 0, bounce: true, flag: 64} platform_id;
}

function onClientInserted (uint256 _platform_id, optional (address) newClientHead,
                           optional (address) leftClient, optional (address) rightClient)
                           external
                           check_client(_platform_id)
{
    require(initialized, SMVErrors.error_not_initialized);
    //new head is set, left client is not set, but new head is not this
    bool int_error1 = newClientHead.hasValue() && (!leftClient.hasValue()) && (newClientHead.get() != address(this));
    //new head is set, left client is set, but new head is this
    bool int_error2 = newClientHead.hasValue() && leftClient.hasValue() && (newClientHead.get() == address(this));
    //currrentHead is not set and new head is not set
    bool int_error3 = (!currentHead.hasValue()) && (!newClientHead.hasValue());

    if (int_error1 || int_error2 || int_error3)
    {
        optional (address) empty;

        uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
        ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, false, empty);
    }
    else
    {
      if (newClientHead.hasValue())
      {
          currentHead.set(newClientHead.get());
      }
      leftBro = leftClient;
      rightBro = rightClient;

      uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
      ISMVTokenLocker(tokenLocker).onClientCompleted {value:extra, flag:1} (platform_id, true, newClientHead);
    }
}

function insertClient (uint256 _platform_id, address newClient, uint128 amount) external  check_client(_platform_id)
{
    require(initialized, SMVErrors.error_not_initialized);
    tvm.accept();

    if (amount < amount_locked())
    {
        if (isTail())
        {
            rightBro.set(newClient);
            optional (address) empty;
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(newClient).onClientInserted {value:extra, flag:1} (platform_id, empty, address(this), empty );
        }
        else
        {
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(rightBro.get()).insertClient {value:extra, flag:1} (platform_id, newClient, amount);
        }
    }
    else
    {
        if (isHead())
        {
            leftBro.set(newClient);
            optional (address) empty;
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(newClient).onClientInserted {value:extra, flag:1} (platform_id, newClient, empty, address(this));
        }
        else
        {
            uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
            LockableBase(leftBro.get()).onRightClientInserted {value:extra, flag:1} (platform_id, newClient);
            leftBro.set(newClient);
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

function onRightClientInserted (uint256 _platform_id, address newClient) external  check_client(_platform_id)
{
    require(initialized, SMVErrors.error_not_initialized);
    require(rightBro.hasValue(), SMVErrors.error_no_right_bro);
    require(msg.sender == rightBro.get(), SMVErrors.error_not_right_bro);
    tvm.accept();

    rightBro.set(newClient);
    optional (address) empty;
    //reserveInitValue();

    uint128 extra = _reserve (SMVConstants.CLIENT_MIN_BALANCE, SMVConstants.ACTION_FEE);
    LockableBase(newClient).onClientInserted {value:extra, flag:1} (platform_id, empty, address(this), msg.sender);
}

function amount_locked () virtual internal view returns(uint128);
function performAction (uint128 amountToLock, uint128 total_votes, TvmCell inputCell) virtual external;
function onCodeUpgrade (uint256 _platform_id, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell) virtual internal;


function getLockedAmount () external view  responsible returns(uint128)
{
    require(msg.value >= SMVConstants.EPSILON_FEE, SMVErrors.error_balance_too_low);

    return {value:0, bounce: false, flag: 64} (amount_locked());
}

function isInitialized () virtual external view responsible check_locker returns(uint256)
{
    if (initialized)
        return {value:0, bounce: false, flag: 64} platform_id;
    else
        revert();    
}

function continueUpdateHead (uint256 _platform_id) virtual external;
function updateHead() virtual external;

}
