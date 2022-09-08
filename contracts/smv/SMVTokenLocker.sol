pragma ton-solidity >=0.54.0;
pragma AbiHeader time;
pragma AbiHeader expire;
// pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
import "Libraries/SMVConstants.sol";

import "Interfaces/ISMVAccount.sol";
import "Interfaces/ISMVTokenLocker.sol";
import "Interfaces/ISMVClient.sol";

import "External/tip3/interfaces/ITokenRoot.sol";
import "External/tip3/interfaces/ITokenWallet.sol";
import "External/tip3/interfaces/IAcceptTokensTransferCallback.sol";

import "SMVClient.sol";
import "TokenWalletOwner.sol";

contract SMVTokenLocker is ISMVTokenLocker , TokenWalletOwner {

address public static smvAccount;

bool public lockerBusy;

optional (address) public clientHead;
/* uint128 public m_tokenBalance;
 */uint128 public votes_locked;

uint256 platformCodeHash;
uint16 platformCodeDepth;

modifier check_account {
    require ( msg.sender == smvAccount, SMVErrors.error_not_my_account) ;
    _ ;
}

modifier check_head {
    require ( msg.sender == clientHead.get(), SMVErrors.error_not_my_head) ;
    _ ;
}

function calcClientAddress (uint256 platform_id) public view returns(uint256)
{
  TvmCell dataCell = tvm.buildDataInit ( {contr:LockerPlatform,
                                          varInit:{
                                             /* tokenLocker: address(this), */
                                             platform_id: platform_id } } );
  uint256 dataHash = tvm.hash (dataCell);
  uint16 dataDepth = dataCell.depth();

  uint256 add_std_address = tvm.stateInitHash (platformCodeHash, dataHash , platformCodeDepth, dataDepth);
  return add_std_address ;
}

modifier check_client (uint256 platform_id) {
  uint256 expected = calcClientAddress (platform_id);
  require ( msg.sender.value == expected, SMVErrors.error_not_my_client) ;
  _ ;
}

function startPlatform (TvmCell platformCode, TvmCell clientCode, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell, uint128 deployFee) external override check_account
{
    require(!lockerBusy, SMVErrors.error_locker_busy);
    require(address(this).balance >= SMVConstants.LOCKER_MIN_BALANCE +
                                     msg.value, SMVErrors.error_balance_too_low+1000);
    require(msg.value > deployFee+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low+1001);
    require(amountToLock <= m_tokenBalance, SMVErrors.error_not_enough_votes);

    TvmSlice s = staticCell.toSlice();
    ( , address locker) = s.decode(uint8, address);

    require(locker == address(this), SMVErrors.error_not_my_locker);
    tvm.accept();

    lockerBusy = true;

    TvmCell _dataInitCell = tvm.buildDataInit ( {contr: LockerPlatform,
                                                 varInit: {  /* tokenLocker: address(this), */
                                                             platform_id: tvm.hash(staticCell) } } );
    TvmCell _stateInit = tvm.buildStateInit(platformCode, _dataInitCell);

    TvmBuilder builder;
    builder.storeRef(inputCell);
    builder.store(clientHead);

    TvmCell _inputCell = builder.toCell();

    uint128 actionValue = (msg.value - deployFee - SMVConstants.ACTION_FEE)/2;
    address platform = address.makeAddrStd(address(this).wid, tvm.hash(_stateInit));

    LockableBase(platform).performAction{value: actionValue, flag:1}(amountToLock, m_tokenBalance, _inputCell);

    new LockerPlatform {/* bounce: false, */
                        value: deployFee + actionValue,
                        stateInit: _stateInit } (clientCode, amountToLock, m_tokenBalance, staticCell, _inputCell);
}

constructor(uint256 _platformCodeHash, uint16 _platformCodeDepth, TvmCell _m_walletCode, address _m_tokenRoot) public check_account
{
    require(address(this).balance >= SMVConstants.LOCKER_INIT_VALUE, SMVErrors.error_balance_too_low);
    tvm.accept();

    lockerBusy = false;
    m_walletCode = _m_walletCode;
    m_tokenRoot = _m_tokenRoot;
    clientHead.reset();
    m_tokenBalance = 0;
    votes_locked = 0;
    platformCodeHash = _platformCodeHash;
    platformCodeDepth = _platformCodeDepth;
    m_tokenWallet = address.makeAddrStd(0,tvm.hash(_buildWalletInitData()));

    ISMVAccount(smvAccount).onLockerDeployed {value: SMVConstants.EPSILON_FEE, flag: 1} ();
}

function returnAllButInitBalance() internal view
{
    uint128 amount = 0;
    if (address(this).balance >= SMVConstants.EPSILON_FEE + SMVConstants.LOCKER_INIT_VALUE)
    {
        amount =  address(this).balance - SMVConstants.LOCKER_INIT_VALUE;
    }
    if (amount > 0 )
    {
        smvAccount.transfer(amount, true, 1);
    }
}

function unlockVoting (uint128 amount) external override check_account
{
    require(address(this).balance >= SMVConstants.LOCKER_MIN_BALANCE +
                                     3*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(!lockerBusy, SMVErrors.error_locker_busy);
    require(amount + votes_locked <= m_tokenBalance, SMVErrors.error_not_enough_votes);
    tvm.accept();

    TvmCell empty;
    if (amount == 0) { amount = m_tokenBalance - votes_locked; }

    m_tokenBalance -= amount;
    //(amount, tip3VotingLocker, 0, address(this), true, empty)
    if (amount > 0)
        ITokenWallet(m_tokenWallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                             (amount, msg.sender, 0, address(this), true, empty);
}

function onHeadUpdated (uint256 _platform_id,
                        optional (address) newClientHead,
                        optional (uint128) newHeadValue) external
                        override check_client(_platform_id)
{
    tvm.accept();

    if (!lockerBusy) { //internal error
        returnAllButInitBalance();
        return;
    }

    clientHead = newClientHead;
    lockerBusy = false;

    if (clientHead.hasValue())
        votes_locked = newHeadValue.get();
    else
        votes_locked = 0;

    returnAllButInitBalance();
}


function onClientCompleted (uint256 _platform_id, bool success,
                            optional (address) newClientHead,
                            optional (uint128) newHeadValue) external override check_client(_platform_id)
{
    tvm.accept();

    if (!lockerBusy) { //internal error
        returnAllButInitBalance();
        return;
    }

    lockerBusy = false;

    if (success && (newClientHead.hasValue()))
    {
        clientHead.set(newClientHead.get());
        votes_locked = newHeadValue.get();
    }

    returnAllButInitBalance();
}

function onClientInserted (uint256 _platform_id) external override check_client(_platform_id)
{
    tvm.accept();
    returnAllButInitBalance();
}

function updateHead() external override check_account
{
    require(msg.value > 5*SMVConstants.VOTING_COMPLETION_FEE +
                        4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(!lockerBusy, SMVErrors.error_locker_busy);

    if (clientHead.hasValue())
    {
        lockerBusy = true;
        LockableBase(clientHead.get()).updateHead {value:
                                     5*SMVConstants.VOTING_COMPLETION_FEE +
                                     3*SMVConstants.ACTION_FEE, flag: 1} ();
    }
}

}