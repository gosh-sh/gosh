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

contract SMVTokenLocker is ISMVTokenLocker , IAcceptTokensTransferCallback {


address public static smvAccount;
address public static tokenRoot;
/* uint256 public static nonce; */

bool public lockerBusy;
bool public platformIsInitializedFailed;
bool public platformConstructorFailed;
optional (address) public clientHead;
uint128 public total_votes;
uint128 public votes_locked;
optional (address) public  tip3Wallet;
uint256 public platformCodeHash;
uint16 public platformCodeDepth;

modifier check_account {
    // revert();
    require ( msg.sender == smvAccount, SMVErrors.error_not_my_account) ;
    _ ;
}

modifier check_wallet {
    require ( msg.sender == tip3Wallet, SMVErrors.error_not_my_wallet) ;
    _ ;
}

modifier check_head {
    require ( msg.sender == clientHead.get(), SMVErrors.error_not_my_head) ;
    _ ;
}

function calcClientAddress (uint256 platform_id) internal view returns(uint256)
{
  TvmCell dataCell = tvm.buildDataInit ( {contr:LockerPlatform,
                                          varInit:{
                                             tokenLocker: address(this),
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

uint128 actionValue;
uint128 actionLockAmount;
TvmCell actionInputCell;

function startPlatform (TvmCell platformCode, TvmCell clientCode, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell, uint128 deployFee) external override check_account
{
    require(!lockerBusy, SMVErrors.error_locker_busy);
    require(address(this).balance >= SMVConstants.LOCKER_MIN_BALANCE +
                                     msg.value, SMVErrors.error_balance_too_low);
    require(msg.value > deployFee+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(amountToLock <= total_votes, SMVErrors.error_not_enough_votes);

    TvmSlice s = staticCell.toSlice();
    (uint8 _, address locker) = s.decode(uint8, address);
    _;
    require(locker == address(this), SMVErrors.error_not_my_locker);
    tvm.accept();

    lockerBusy = true;
    platformIsInitializedFailed  = false;
    platformConstructorFailed = false;

    TvmCell _dataInitCell = tvm.buildDataInit ( {contr: LockerPlatform,
                                                 varInit: {  tokenLocker: address(this),
                                                             platform_id: tvm.hash(staticCell) } } );
    TvmCell _stateInit = tvm.buildStateInit(platformCode, _dataInitCell);

    TvmBuilder builder;
    builder.storeRef(inputCell);
    builder.store(clientHead);

    TvmCell _inputCell = builder.toCell();

    actionValue = msg.value - deployFee - SMVConstants.ACTION_FEE;
    actionLockAmount = amountToLock;
    actionInputCell = _inputCell;

    address platform = address.makeAddrStd(address(this).wid, tvm.hash(_stateInit));

    LockableBase(platform).isInitialized{value: SMVConstants.ACTION_FEE, flag:1, callback: SMVTokenLocker.onInitialized}();

    new LockerPlatform {/* bounce: false, */
                        value: deployFee,
                        stateInit: _stateInit } (clientCode, amountToLock, staticCell, _inputCell);


    /* if (msg.value > deployFee + 2*SMVConstants.ACTION_FEE) {
        LockableBase(platform).performAction {value: msg.value - deployFee - SMVConstants.ACTION_FEE, flag: 1} (amountToLock, inputCell);
    } */

    /* returnAllButInitBalance(); */
}

function onInitialized(uint256 _platform_id) external override check_client(_platform_id)
{
    LockableBase(msg.sender).performAction {value: actionValue, flag: 1} (actionLockAmount, total_votes, actionInputCell);
}


constructor(uint256 _platformCodeHash, uint16 _platformCodeDepth) public check_account
{
    require(address(this).balance >= /* SMVConstants.TIP3_WALLET_DEPLOY_VALUE +
                                     SMVConstants.TIP3_WALLET_INIT_VALUE + */
                                     SMVConstants.LOCKER_INIT_VALUE, SMVErrors.error_balance_too_low);
    tvm.accept();

    lockerBusy = false;
    clientHead.reset();
    total_votes = 0;
    votes_locked = 0;
    platformCodeHash = _platformCodeHash;
    platformCodeDepth = _platformCodeDepth;
    tip3Wallet.reset();

    /* tip3Wallet = ITokenRoot(tokenRoot).deployWallet {value: SMVConstants.TIP3_WALLET_DEPLOY_VALUE + SMVConstants.TIP3_WALLET_INIT_VALUE,
                                                    flag: 1}
                                                   (address(this), SMVConstants.TIP3_WALLET_INIT_VALUE).await; */

    ISMVAccount(smvAccount).onLockerDeployed {value: SMVConstants.EPSILON_FEE, flag: 1} ();
}

function onAcceptTokensTransfer (address root,
                                 uint128 amount,
                                 address /* sender */,
                                 address /* sender_wallet */,
                                 address gasTo,
                                 TvmCell /* payload */) external override /* check_wallet */
{
    require(tokenRoot == root, SMVErrors.error_not_my_token_root);
    require(!tip3Wallet.hasValue() || (tip3Wallet.get() == msg.sender), SMVErrors.error_not_my_wallet);
    tvm.accept();

    if (!tip3Wallet.hasValue()) {
        tip3Wallet.set(msg.sender);
    }

    total_votes += amount;
    gasTo.transfer(0, true, 64);
}

function returnAllButInitBalance() internal view
{
    //tvm.rawReserve(SMVConstants.LOCKER_INIT_VALUE, 2 );
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
    require(amount + votes_locked <= total_votes, SMVErrors.error_not_enough_votes);
    require(tip3Wallet.hasValue());
    tvm.accept();

    TvmCell empty;
    if (amount == 0) { amount = total_votes - votes_locked; }

    total_votes -= amount;
    //(amount, tip3VotingLocker, 0, address(this), true, empty)
    if (amount > 0)
        ITokenWallet(tip3Wallet.get()).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                                (amount, msg.sender, 0, address(this), true, empty);
}

function onHeadUpdated (uint256 _platform_id, optional (address) newClientHead) external
                        override check_client(_platform_id)
{
    tvm.accept();

    if (!lockerBusy) { //internal error
        returnAllButInitBalance();
        return;
    }

    clientHead = newClientHead;

    if (clientHead.hasValue()) 
    {
        address head = clientHead.get();
        LockableBase(head).getLockedAmount {value: SMVConstants.ACTION_FEE, flag: 1, callback: SMVTokenLocker.onLockAmountUpdate}();
    }
    else
    {
        lockerBusy = false;
        votes_locked = 0;
        returnAllButInitBalance();
    }
}


function onClientCompleted (uint256 _platform_id, bool success, optional (address) newClientHead) external
                           override check_client(_platform_id)
{
    tvm.accept();

    if (!lockerBusy) { //internal error
        returnAllButInitBalance();
        return;
    }

    if (success && (newClientHead.hasValue()))
    {
        clientHead.set(newClientHead.get());
        address head = clientHead.get();
        LockableBase(head).getLockedAmount {value: SMVConstants.ACTION_FEE, flag: 1, callback: SMVTokenLocker.onLockAmountUpdate}();
    }
    else
    {
        lockerBusy = false;
        returnAllButInitBalance();
    }
}

function onLockAmountUpdate(uint128 amount) external  check_head
{
    tvm.accept();

    votes_locked = amount;
    lockerBusy = false;
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

onBounce(TvmSlice body) external  {
    uint32 functionId = body.decode(uint32);
    if (functionId == tvm.functionId(LockableBase.isInitialized)) 
    {
       platformIsInitializedFailed = true;
       if (platformConstructorFailed)
       {
            lockerBusy = false;
            returnAllButInitBalance();
       }
    }
    else
    if (functionId == tvm.functionId(LockableBase))
    {
       platformConstructorFailed = true;
       if (platformIsInitializedFailed)
       {
            lockerBusy = false;
            returnAllButInitBalance();
       }
    }
}

}