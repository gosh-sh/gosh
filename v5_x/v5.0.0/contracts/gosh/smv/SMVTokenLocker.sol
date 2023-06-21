pragma ton-solidity >=0.54.0;
pragma AbiHeader time;
pragma AbiHeader expire;
// pragma AbiHeader pubkey;

import "./Libraries/SMVErrors.sol";
import "./Libraries/SMVConstants.sol";

import "./Interfaces/ISMVAccount.sol";
import "./Interfaces/ISMVTokenLocker.sol";
import "./Interfaces/ISMVClient.sol";

import "./External/tip3/interfaces/ITokenRoot.sol";
import "./External/tip3/interfaces/ITokenWallet.sol";
import "./External/tip3/interfaces/IAcceptTokensTransferCallback.sol";
import "./External/tip3/interfaces/IAcceptTokensBurnCallback.sol";


import "./SMVClient.sol";
import "./TokenWalletOwner.sol";

contract SMVTokenLocker is ISMVTokenLocker , TokenWalletOwner , IAcceptTokensBurnCallback {

address _goshdao;
address public static smvAccount;

bool public lockerBusy;
bool public platformPerformActionFailed;
bool public platformConstructorFailed;


optional (address) public clientHead;
/* uint128 public m_tokenBalance;
 */uint128 public votes_locked;

uint256 platformCodeHash;
uint16 platformCodeDepth;
uint32 public m_num_clients;

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

function startPlatform (TvmCell platformCode, TvmCell clientCode, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell, uint128 deployFee, address goshdao) external override check_account
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
    platformPerformActionFailed  = false;
    platformConstructorFailed = false;


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

    LockableBase(platform).performAction{value: actionValue, flag:1}(amountToLock, m_tokenBalance, _inputCell, goshdao);

    new LockerPlatform {/* bounce: false, */
                        value: deployFee + actionValue,
                        stateInit: _stateInit } (_goshdao, clientCode, amountToLock, m_tokenBalance, staticCell, _inputCell);
    m_num_clients ++;
}

constructor(uint256 _platformCodeHash, uint16 _platformCodeDepth, TvmCell _m_walletCode, address _m_tokenRoot, address goshdao) check_account
{
    require(address(this).balance >= SMVConstants.LOCKER_INIT_VALUE, SMVErrors.error_balance_too_low);
    tvm.accept();
    
    _goshdao = goshdao;
    lockerBusy = false;
    m_tokenWalletCode = _m_walletCode;
    m_tokenRoot = _m_tokenRoot;
    clientHead.reset();
    m_tokenBalance = 0;
    votes_locked = 0;
    m_num_clients = 0;
    platformCodeHash = _platformCodeHash;
    platformCodeDepth = _platformCodeDepth;
    m_tokenWallet = address.makeAddrStd(0,tvm.hash(_buildWalletInitData()));

    ISMVAccount(smvAccount).onLockerDeployed {value: SMVConstants.EPSILON_FEE, flag: 1} ();
}

function _returnAllButInitBalance() internal view
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

/* function lockVoting (uint128 amount) external override check_account
{
    require(address(this).balance >= SMVConstants.LOCKER_MIN_BALANCE +
                                     3*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(!lockerBusy, SMVErrors.error_locker_busy);
    //require(amount + votes_locked <= m_tokenBalance, SMVErrors.error_not_enough_votes);
    tvm.accept();

    GoshDao(_goshdao).requestMint {value: SMVConstants.EPSILON_FEE} (address(this), _pubaddr, DEFAULT_DAO_BALANCE, _index);
} */

function unlockVoting (uint128 amount) external override check_account
{
    require(address(this).balance >= SMVConstants.LOCKER_MIN_BALANCE +
                                     3*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(!lockerBusy, SMVErrors.error_locker_busy);
    require(amount + votes_locked <= m_tokenBalance, SMVErrors.error_not_enough_votes);
    tvm.accept();

    /* TvmCell empty; */
    if (amount == 0) { amount = m_tokenBalance - votes_locked; }

    m_tokenBalance -= amount;
    //(amount, tip3VotingLocker, 0, address(this), true, empty)
    if (amount > 0)
        /* ITokenWallet(m_tokenWallet).transfer {value: 0, flag: 64}
                                             (amount, msg.sender, 0, msg.sender, true, empty); */
        ISMVAccount(msg.sender).acceptUnlock {value: 0, flag: 64} (amount);
    else
        _returnAllButInitBalance();
}

function onAcceptTokensBurn(
        uint128 amount,
        address /* walletOwner */,
        address /* wallet */,
        address remainingGasTo,
        TvmCell /* payload */
    ) external override  check_token_root
{
    ISMVAccount(smvAccount).returnDAOBalance {value: SMVConstants.ACTION_FEE} (amount);
    remainingGasTo.transfer(0, true, 64);
}

function onHeadUpdated (uint256 _platform_id,
                        optional (address) newClientHead,
                        optional (uint128) newHeadValue) external
                        override check_client(_platform_id)
{
    tvm.accept();

    if (!lockerBusy) { //internal error
        _returnAllButInitBalance();
        return;
    }

    clientHead = newClientHead;
    lockerBusy = false;

    if (clientHead.hasValue())
        votes_locked = newHeadValue.get();
    else
        votes_locked = 0;

    _returnAllButInitBalance();
}


function onClientCompleted (uint256 _platform_id, bool success,
                            optional (address) newClientHead,
                            optional (uint128) newHeadValue,
                            bool isDead ) external override check_client(_platform_id)
{
    tvm.accept();

    if (!lockerBusy) { //internal error
        _returnAllButInitBalance();
        return;
    }

    lockerBusy = false;

    if (success && (newClientHead.hasValue()))
    {
        clientHead.set(newClientHead.get());
        votes_locked = newHeadValue.get();
    }
    if (isDead) {
        m_num_clients --;
    }
    _returnAllButInitBalance();
}

function onClientInserted (uint256 _platform_id) external override check_client(_platform_id)
{
    tvm.accept();
    _returnAllButInitBalance();
}

function onClientRemoved (uint256 _platform_id) external override check_client(_platform_id)
{
    tvm.accept();
    m_num_clients --;
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

function returnAllButInitBalance() external override check_account
{
    _returnAllButInitBalance();
}

function upgradeCode(TvmCell code) external check_account
{
   tvm.setcode(code);
   tvm.setCurrentCode(code);

   /* address public m_tokenRoot;
address public m_tokenWallet;
uint128 public m_tokenBalance;
TvmCell public m_tokenWalletCode; */

    TvmBuilder b;
    TvmBuilder b1;

    b1.store(_goshdao, m_tokenRoot, m_tokenWallet, m_tokenBalance);
    b1.storeRef(m_tokenWalletCode);

/* address public static smvAccount;

bool public lockerBusy;
bool public platformPerformActionFailed;
bool public platformConstructorFailed;


optional (address) public clientHead;
uint128 public votes_locked;

uint256 platformCodeHash;
uint16 platformCodeDepth;
uint32 public m_num_clients; */
    TvmBuilder b2;
    b2.store(smvAccount, lockerBusy, platformPerformActionFailed, platformConstructorFailed, clientHead, votes_locked, platformCodeHash, platformCodeDepth, m_num_clients );

    b.storeRef(b1);
    b.storeRef(b2);

    onCodeUpgrade(b.toCell());
}

function onCodeUpgrade (TvmCell ) private
{}

onBounce(TvmSlice body) external  {
    uint32 functionId = body.decode(uint32);
    if (functionId == tvm.functionId(LockableBase.performAction)) 
    {
       platformPerformActionFailed = true;
       if (platformConstructorFailed)
       {
            lockerBusy = false;
            _returnAllButInitBalance();
       }
    }
    else
    if (functionId == tvm.functionId(LockerPlatform))
    {
       m_num_clients --;
       platformConstructorFailed = true;
       if (platformPerformActionFailed)
       {
            lockerBusy = false;
            _returnAllButInitBalance();
       }
    }
}
}
