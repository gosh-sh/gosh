pragma ton-solidity >=0.54.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
import "Libraries/SMVConstants.sol";

import "Interfaces/ISMVAccount.sol";
import "Interfaces/ISMVTokenLocker.sol";
import "Interfaces/IVotingResultRecipient.sol";

/* import "Interfaces/ISMVClient.sol"; */

import "External/tip3/interfaces/ITokenRoot.sol";
import "External/tip3/interfaces/ITokenWallet.sol";
import "External/tip3/interfaces/IAcceptTokensTransferCallback.sol";
import "External/tip3/interfaces/IAcceptTokensMintCallback.sol";
import "External/tip3/interfaces/IBounceTokensTransferCallback.sol";

import "SMVTokenLocker.sol";

contract SMVAccount is ISMVAccount , IAcceptTokensTransferCallback, IAcceptTokensMintCallback, IBounceTokensTransferCallback {

address /* static */ public tip3Root;
uint256 /* static */ nonce;

address public tip3Wallet;
address public tip3VotingLocker;
uint256 clientCodeHash;
uint16  clientCodeDepth;
uint256 proposalCodeHash;
uint16  proposalCodeDepth;
uint256 platformCodeHash;
uint16  platformCodeDepth;
uint256 lockerCodeHash;
uint16  lockerCodeDepth;
address public lockerTip3Wallet;

bool  public  initialized;
uint128 public _tokenBalance;


// mapping to store hashes of inbound messages;
mapping(uint256 => uint32) m_messages;
LastMsg m_lastMsg;
// Each transaction is limited by gas, so we must limit count of iteration in loop.
uint8 constant MAX_CLEANUP_MSGS = 20;

modifier saveMsg() {
    /* m_messages[m_lastMsg.msgHash] = m_lastMsg.expireAt;
    gc(); */
    _saveMsg();
    _;
}


function _saveMsg() inline internal {
    m_messages[m_lastMsg.msgHash] = m_lastMsg.expireAt;
    gc();
}

struct LastMsg {
    uint32 expireAt;
    uint256 msgHash;
}

function gc() private {
        uint counter = 0;
        for ((uint256 msgHash, uint32 expireAt) : m_messages) {
            if (counter >= MAX_CLEANUP_MSGS) {
                break;
            }
            counter++;
            if (expireAt <= now) {
                delete m_messages[msgHash];
            }
        }
    }



modifier check_owner {
  require ( msg.pubkey () != 0, SMVErrors.error_not_external_message );
  require ( tvm.pubkey () == msg.pubkey (), SMVErrors.error_not_my_pubkey );
  _ ;
}

modifier check_wallet {
  require ( msg.sender == tip3Wallet, SMVErrors.error_not_my_wallet) ;
  _ ;
}

modifier check_locker {
  require ( msg.sender == tip3VotingLocker, SMVErrors.error_not_my_locker) ;
  _ ;
}

modifier check_token_root {
  require ( msg.sender == tip3Root, SMVErrors.error_not_my_locker) ;
  _ ;
}

constructor(TvmCell lockerCode, uint256 _platformCodeHash, uint16 _platformCodeDepth,
                                uint256 _clientCodeHash, uint16 _clientCodeDepth,
                                uint256 _proposalCodeHash, uint16 _proposalCodeDepth,
                                address _tip3Root) public 
{
    require(address(this).balance >= 2*SMVConstants.TIP3_WALLET_DEPLOY_VALUE +
                                     2*SMVConstants.TIP3_WALLET_INIT_VALUE +
                                     SMVConstants.ACCOUNT_INIT_VALUE +
                                     SMVConstants.LOCKER_INIT_VALUE +
                                     SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();

    initialized = false;
    tip3Root = _tip3Root;
    ITokenRoot(tip3Root).deployWallet {value: SMVConstants.TIP3_WALLET_DEPLOY_VALUE + SMVConstants.TIP3_WALLET_INIT_VALUE,
                                       flag: 1,
                                       callback: SMVAccount.onTokenWalletDeployed} (address(this), SMVConstants.TIP3_WALLET_INIT_VALUE);

    TvmCell _dataInitCell = tvm.buildDataInit ( {contr: SMVTokenLocker,
                                                 varInit: { smvAccount : address(this) ,
                                                            tokenRoot : tip3Root } } );
    TvmCell _stateInit = tvm.buildStateInit(lockerCode, _dataInitCell);

    platformCodeHash = _platformCodeHash;
    platformCodeDepth = _platformCodeDepth;

    clientCodeHash = _clientCodeHash;
    clientCodeDepth = _clientCodeDepth;

    proposalCodeHash = _proposalCodeHash;
    proposalCodeDepth = _proposalCodeDepth;

    lockerCodeHash = tvm.hash(lockerCode);
    lockerCodeDepth = lockerCode.depth();

    tip3VotingLocker = new SMVTokenLocker { value: SMVConstants.LOCKER_INIT_VALUE +
                                                   SMVConstants.ACTION_FEE,
                                            stateInit:_stateInit } (platformCodeHash, platformCodeDepth); 
}

function onTokenWalletDeployed (address wallet) external check_token_root
{
      tip3Wallet = wallet;
}


function proposalIsCompleted(address proposal) external check_owner /* saveMsg */ {
    tvm.accept();
    _saveMsg();

    ISMVProposal(proposal).isCompleted{
      value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.EPSILON_FEE
      /* callback: SMVAccount.isCompletedCallback */
    }();
}

optional(bool) public lastVoteResult;

function onLockerDeployed() external override check_locker()
{
    require(!initialized, SMVErrors.error_already_initialized);
    tvm.accept();

    initialized = true;

    /* lockerTip3Wallet =  */
    ITokenRoot(tip3Root).deployWallet {value: SMVConstants.TIP3_WALLET_DEPLOY_VALUE + SMVConstants.TIP3_WALLET_INIT_VALUE,
                                       flag: 1, 
                                       callback: SMVAccount.onLockerTokenWalletDeployed} (tip3VotingLocker, SMVConstants.TIP3_WALLET_INIT_VALUE);
}

function onLockerTokenWalletDeployed (address wallet) external check_token_root
{
      lockerTip3Wallet = wallet;
}

function onTokenBalanceUpdateWhileLockVoting (uint128 balance) external check_wallet
{
    if (lockingAmount == 0) {lockingAmount = balance;}

    if ((lockingAmount > 0) && (lockingAmount <= balance))
    {
        TvmCell empty;
        ITokenWallet(tip3Wallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                          (lockingAmount, tip3VotingLocker, 0, address(this), true, empty) ;
        _tokenBalance = balance - lockingAmount;
    }
    else 
      _tokenBalance = balance;

    lockingAmount = 0;
}

uint128 lockingAmount;

function lockVoting (uint128 amount) external check_owner /* saveMsg */
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low); 
    require(lockingAmount == 0);                                                               
    tvm.accept();

    _saveMsg();

    ITokenWallet(tip3Wallet).balance {value: SMVConstants.ACTION_FEE, 
                                      flag:1, 
                                      callback: SMVAccount.onTokenBalanceUpdateWhileLockVoting} ();

    lockingAmount = amount;
}

function unlockVoting (uint128 amount) external  check_owner /* saveMsg */
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVTokenLocker(tip3VotingLocker).unlockVoting {value: 3*SMVConstants.ACTION_FEE, flag: 1}
                                                   (amount);
}

function voteFor (TvmCell platformCode, TvmCell clientCode, address proposal, bool choice, uint128 amount) external  check_owner /* saveMsg */
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    SMVConstants.VOTING_FEE +
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE +
                                    9*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);

    require(tvm.hash(platformCode) == platformCodeHash,SMVErrors.error_not_my_code_hash);
    require(platformCode.depth() == platformCodeDepth, SMVErrors.error_not_my_code_depth);

    require(tvm.hash(clientCode) == clientCodeHash,SMVErrors.error_not_my_code_hash);
    require(clientCode.depth() == clientCodeDepth, SMVErrors.error_not_my_code_depth);
    tvm.accept();
    _saveMsg();

    TvmBuilder staticBuilder;
    uint8 platformType = 0;
    staticBuilder.store(platformType, tip3VotingLocker, proposal, platformCodeHash, platformCodeDepth);

    TvmBuilder inputBuilder;
    inputBuilder.store(choice);

    ISMVTokenLocker(tip3VotingLocker).startPlatform
                    {value:  SMVConstants.VOTING_FEE +
                             SMVConstants.CLIENT_INIT_VALUE +
                             SMVConstants.PROP_INITIALIZE_FEE +
                             8*SMVConstants.ACTION_FEE, flag: 1 }
                    (platformCode, clientCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE + 5*SMVConstants.ACTION_FEE);
}

function startProposal (TvmCell platformCode, TvmCell proposalCode, uint256 propId, TvmCell propData,
                        uint32 startTime, uint32 finishTime) internal view /* check_owner saveMsg  returns (address)  */
{
    /* require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    SMVConstants.PROPOSAL_INIT_VALUE +
                                    SMVConstants.VOTING_FEE+
                                    8*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low); //check 8

    require(tvm.hash(platformCode) == platformCodeHash,SMVErrors.error_not_my_code_hash);
    require(platformCode.depth() == platformCodeDepth, SMVErrors.error_not_my_code_depth);

    require(tvm.hash(proposalCode) == proposalCodeHash,SMVErrors.error_not_my_code_hash);
    require(proposalCode.depth() == proposalCodeDepth, SMVErrors.error_not_my_code_depth);
    require(now <= startTime, SMVErrors.error_time_too_late);
    require(startTime < finishTime, SMVErrors.error_times);
    tvm.accept(); */

    TvmBuilder staticBuilder;
    uint8 platformType = 1;
    staticBuilder.store(platformType, tip3VotingLocker, propId, platformCodeHash, platformCodeDepth);

    TvmBuilder inputBuilder;
    inputBuilder.storeRef(propData);
    TvmBuilder t;
    t.store(startTime, finishTime, address(this), tip3Root);
    inputBuilder.storeRef(t.toCell());

    uint128 amount = 20; //get from Config

    ISMVTokenLocker(tip3VotingLocker).startPlatform
                    {value:  SMVConstants.VOTING_FEE +
                             SMVConstants.PROPOSAL_INIT_VALUE +
                             7*SMVConstants.ACTION_FEE, flag: 1 }
                    (platformCode, proposalCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                             SMVConstants.PROPOSAL_INIT_VALUE + 5*SMVConstants.ACTION_FEE);

}

function proposalAddress(
  address _tip3VotingLocker,
  uint256 propId
) public view returns(address) {

  TvmBuilder staticBuilder;
  uint8 platformType = 1;
  staticBuilder.store(platformType, _tip3VotingLocker, propId, platformCodeHash, platformCodeDepth);

  TvmCell dc = tvm.buildDataInit ( {contr: LockerPlatform,
                                                 varInit: {  tokenLocker: _tip3VotingLocker,
                                                             platform_id: tvm.hash(staticBuilder.toCell()) } } );
  uint256 addr_std = tvm.stateInitHash(platformCodeHash, tvm.hash(dc), platformCodeDepth, dc.depth());
  return address.makeAddrStd(address(this).wid, addr_std);
}

function proposalAddressByAccount(address acc, /* uint256 nonce, */ uint256 propId) public view returns(address)
{
    TvmCell dc = tvm.buildDataInit ( {contr: SMVTokenLocker,
                                                 varInit: { smvAccount : acc ,
                                                            tokenRoot : tip3Root
                                                            /* nonce: nonce */ } } );
    uint256 addr_std_locker = tvm.stateInitHash (lockerCodeHash, tvm.hash(dc) , lockerCodeDepth, dc.depth());
    address locker_addr = address.makeAddrStd(address(this).wid, addr_std_locker);
    return proposalAddress(locker_addr, propId);
}    
    

function clientAddress(
  address _tip3VotingLocker,
  uint256 propId
) public view returns(address) {

  TvmBuilder staticBuilder;
  uint8 platformType = 0;
  staticBuilder.store(platformType, tip3VotingLocker, proposalAddress(_tip3VotingLocker, propId), platformCodeHash, platformCodeDepth);

  TvmCell dc = tvm.buildDataInit ( {contr: LockerPlatform,
                                                 varInit: {  tokenLocker: tip3VotingLocker,
                                                             platform_id: tvm.hash(staticBuilder.toCell()) } } );
  uint256 addr_std = tvm.stateInitHash (platformCodeHash, tvm.hash(dc) , platformCodeDepth, dc.depth());
  return address.makeAddrStd(address(this).wid, addr_std);
}


function killAccount (address address_to, address tokens_to) external check_owner /* saveMsg */
{
    require(!initialized);
    tokens_to;
    tvm.accept();
    _saveMsg();
    
    selfdestruct(address_to);
}

function withdrawTokens (address address_to, uint128 amount) public check_owner /* saveMsg */
{
     require(initialized, SMVErrors.error_not_initialized);
     require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
     tvm.accept();

     _saveMsg();

     TvmCell empty;
     ITokenWallet(tip3Wallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                          (amount, address_to, 0, address(this), true, empty) ;
}

function updateHead() public check_owner /* saveMsg */
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+
                                    5*SMVConstants.VOTING_COMPLETION_FEE +                              
                                    6*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);

    tvm.accept();
    _saveMsg();

    ISMVTokenLocker(tip3VotingLocker).updateHead {value: 5*SMVConstants.VOTING_COMPLETION_FEE +                              
                                                         5*SMVConstants.ACTION_FEE, flag: 1} ();
}

function onAcceptTokensTransfer (address tokenRoot,
                                 uint128 amount,
                                 address sender,
                                 address sender_wallet,
                                 address gasTo,
                                 TvmCell payload) external override check_wallet
{
    tokenRoot; sender_wallet; sender; gasTo; payload;
    _tokenBalance += amount;
}
function onAcceptTokensMint (address tokenRoot,
                             uint128 amount,
                             address remainingGasTo,
                             TvmCell payload) external override check_wallet
{
    tokenRoot; remainingGasTo; payload;
    _tokenBalance += amount;
}

function onBounceTokensTransfer(address root, uint128 amount, address wallet_to) external override check_wallet
{
    root; wallet_to;
    _tokenBalance  += amount;
}


}