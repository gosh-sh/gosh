pragma ton-solidity >=0.54.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./modifiers/modifiers.sol";
import "./modifiers/SMVconfiguration.sol";

import "./Libraries/SMVErrors.sol";
import "./Libraries/SMVConstants.sol";

import "./Interfaces/ISMVAccount.sol";
import "./Interfaces/ISMVTokenLocker.sol";
import "./Interfaces/IVotingResultRecipient.sol";
import "./Interfaces/Igoshdao.sol";

/* import "Interfaces/ISMVClient.sol"; */

import "./External/tip3/interfaces/ITokenRoot.sol";
import "./External/tip3/interfaces/ITokenWallet.sol";
import "./External/tip3/interfaces/IAcceptTokensTransferCallback.sol";
import "./External/tip3/interfaces/IAcceptTokensMintCallback.sol";
import "./External/tip3/interfaces/IBounceTokensTransferCallback.sol";

import "./SMVTokenLocker.sol";
import "./TokenWalletOwner.sol";



contract SMVAccount is Modifiers, ISMVAccount, SMVConfiguration /* , TokenWalletOwner */ {

    address _pubaddr; //from goshwallet
    address static _goshdao;  //from goshwallet
    uint128 static _index; //from goshwallet


uint256 /* static */ nonce;

uint128 public m_pseudoDAOBalance;
uint128 public m_pseudoDAOVoteBalance;
address m_tokenRoot;
TvmCell m_tokenWalletCode;

address public lockerTip3Wallet;
bool    public initialized;
address public tip3VotingLocker;
optional(bool) public lastVoteResult;

uint256 clientCodeHash;
uint16  clientCodeDepth;
uint256 proposalCodeHash;
uint16  proposalCodeDepth;
uint256 platformCodeHash;
uint16  platformCodeDepth;
uint256 lockerCodeHash;
uint16  lockerCodeDepth;

TvmCell m_SMVPlatformCode;
TvmCell m_SMVProposalCode;
TvmCell m_SMVClientCode;
TvmCell m_lockerCode;

optional(uint256) _access;

modifier check_owner  {
  require ( msg.pubkey () != 0, SMVErrors.error_not_external_message );
  require ( tvm.pubkey () == msg.pubkey (), SMVErrors.error_not_my_pubkey );
  _ ;
}

uint16 constant error_not_my_root = 1003;

modifier check_token_root {
  require ( msg.sender == m_tokenRoot, error_not_my_root) ;
  _ ;
}

modifier check_locker {
  require ( msg.sender == tip3VotingLocker, SMVErrors.error_not_my_locker) ;
  _ ;
}

uint128 DEFAULT_DAO_BALANCE;
uint128 DEFAULT_DAO_VOTE_BALANCE;
uint128 constant DEFAULT_PROPOSAL_VALUE = 20;
    
uint128 public _lockedBalance = 0;
uint128 public _totalDoubt = 0;

constructor(address pubaddr, TvmCell lockerCode, TvmCell tokenWalletCode,
            uint256 _platformCodeHash, uint16 _platformCodeDepth,
            uint256 _clientCodeHash, uint16 _clientCodeDepth,
            uint256 _proposalCodeHash, uint16 _proposalCodeDepth, uint128 tokenforperson,
            address _tip3Root)
{
    _pubaddr = pubaddr; /* from goshWallet */
    if (_index != 0) return;

    require(address(this).balance >= 2*SMVConstants.TIP3_WALLET_DEPLOY_VALUE +
                                     2*SMVConstants.TIP3_WALLET_INIT_VALUE +
                                     SMVConstants.ACCOUNT_INIT_VALUE +
                                     SMVConstants.LOCKER_INIT_VALUE +
                                     SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    DEFAULT_DAO_BALANCE = tokenforperson;
    initialized = false;
    
    m_tokenRoot = _tip3Root;
    m_tokenWalletCode = tokenWalletCode;
    /* ITokenRoot(m_tokenRoot).deployWallet {value: SMVConstants.TIP3_WALLET_DEPLOY_VALUE + SMVConstants.TIP3_WALLET_INIT_VALUE,
                                          flag: 1,
                                          callback: SMVAccount.onTokenWalletDeployed} (address(this), SMVConstants.TIP3_WALLET_INIT_VALUE);
 */
    TvmCell _dataInitCell = tvm.buildDataInit ( {contr: SMVTokenLocker,
                                                 varInit: { smvAccount : address(this) } } );
    TvmCell _stateInit = tvm.buildStateInit(lockerCode, _dataInitCell);

    platformCodeHash = _platformCodeHash;
    platformCodeDepth = _platformCodeDepth;

    clientCodeHash = _clientCodeHash;
    clientCodeDepth = _clientCodeDepth;

    proposalCodeHash = _proposalCodeHash;
    proposalCodeDepth = _proposalCodeDepth;

    lockerCodeHash = tvm.hash(lockerCode);
    lockerCodeDepth = lockerCode.depth();

    //m_tokenWallet = address.makeAddrStd(0,tvm.hash(_buildWalletInitData()));
    
    tip3VotingLocker = new SMVTokenLocker { value: SMVConstants.LOCKER_INIT_VALUE +
                                                   SMVConstants.ACTION_FEE,
                                            stateInit:_stateInit } (platformCodeHash, platformCodeDepth, m_tokenWalletCode, m_tokenRoot, _goshdao);
    m_pseudoDAOBalance = DEFAULT_DAO_BALANCE;
    m_pseudoDAOVoteBalance = DEFAULT_DAO_BALANCE;
}

function proposalIsCompleted(address proposal) external onlyOwnerPubkey(_access.get()) {
    tvm.accept();
    _saveMsg();

    ISMVProposal(proposal).isCompleted{
      value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.EPSILON_FEE
    }();
}

function onLockerDeployed() external override check_locker()
{
    require(!initialized, SMVErrors.error_already_initialized);
    tvm.accept();

    initialized = true;

    ITokenRoot(m_tokenRoot).deployWallet {value: SMVConstants.TIP3_WALLET_DEPLOY_VALUE + SMVConstants.TIP3_WALLET_INIT_VALUE,
                                       flag: 1,
                                       callback: SMVAccount.onLockerTokenWalletDeployed} (tip3VotingLocker, SMVConstants.TIP3_WALLET_INIT_VALUE);
}

function onLockerTokenWalletDeployed (address wallet) external check_token_root
{
      lockerTip3Wallet = wallet;
      lockVoting(0);
}

/*
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
 */

function lockVoting (uint128 amount) public /* onlyOwnerPubkey(_access.get()) */
{
    if (msg.value == 0) {
        require(msg.pubkey() == _access.get(), ERR_NOT_OWNER);
        require(initialized, SMVErrors.error_not_initialized);
        require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    2*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
        tvm.accept();
        _saveMsg();
    }
    else{
        if (!initialized) return;
        if (!(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                      2*SMVConstants.ACTION_FEE)) return;
        tvm.accept();
    }

    if (amount == 0) {
        amount = math.min(m_pseudoDAOBalance, m_pseudoDAOVoteBalance);
    }

    if ((amount > 0) && (amount <= m_pseudoDAOBalance) && (amount <= m_pseudoDAOVoteBalance))
    {
        IGoshDao(_goshdao).requestMint {value: SMVConstants.ACTION_FEE} (tip3VotingLocker, _pubaddr, amount, _index);
        m_pseudoDAOBalance = m_pseudoDAOBalance - amount;
        m_pseudoDAOVoteBalance -= amount;
        _lockedBalance += amount;
    }
}

function returnDAOBalance (uint128 amount) external override check_locker
{
    m_pseudoDAOBalance += amount;
    m_pseudoDAOVoteBalance += amount;
    if (_totalDoubt <= m_pseudoDAOVoteBalance) {
        m_pseudoDAOVoteBalance -= _totalDoubt;
        _totalDoubt = 0;
    } else {
        _totalDoubt -= m_pseudoDAOVoteBalance;
        m_pseudoDAOVoteBalance = 0;
    }
}

function acceptUnlock (uint128 amount) external override check_locker
{   
    _lockedBalance -= amount;
    IGoshDao(_goshdao).requestBurn {value: SMVConstants.ACTION_FEE} (tip3VotingLocker, _pubaddr, amount, _index);
}

function unlockVoting (uint128 amount) external onlyOwnerPubkey(_access.get())
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVTokenLocker(tip3VotingLocker).unlockVoting {value: 3*SMVConstants.ACTION_FEE, flag: 1}
                                                   (amount);
}

function unlockVotingInAcc (uint128 amount) private
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVTokenLocker(tip3VotingLocker).unlockVoting {value: 3*SMVConstants.ACTION_FEE, flag: 1}
                                                   (amount);
}

/* function voteFor ( uint256 platform_id, bool choice, uint128 amount, uint128 num_clients) external  check_owner
{
    require(initialized, SMVErrors.error_not_initialized);
    tvm.accept();
    _saveMsg();
}
 */

function getPlatfotmId (uint256 propId, uint8 platformType, address _tip3VotingLocker) public view returns (uint256)
{
    TvmBuilder staticBuilder;
/*     uint8 platformType = 1;
 */    staticBuilder.store(platformType, _tip3VotingLocker, propId, platformCodeHash, platformCodeDepth);
    return tvm.hash(staticBuilder.toCell());
}

function acceptReviewer (address propAddress) external  onlyOwnerPubkey(_access.get())
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVProposal(propAddress).acceptReviewer{value: SMVConstants.ACTION_FEE, flag: 1}();

}

function rejectReviewer (address propAddress) external  onlyOwnerPubkey(_access.get())
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    SMVConstants.ACTION_FEE + SMVConstants.EPSILON_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVProposal(propAddress).rejectReviewer{value: SMVConstants.ACTION_FEE + SMVConstants.EPSILON_FEE, flag: 1}();

}


function startProposal (/* TvmCell platformCode, TvmCell proposalCode, */ uint256 propId, TvmCell propData,
                        uint32 startTime, uint32 finishTime, uint128 num_clients, string[] isTag) internal view /* public check_owner */
{
/*     require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    SMVConstants.PROPOSAL_INIT_VALUE +
                                    SMVConstants.VOTING_FEE + num_clients*SMVConstants.CLIENT_LIST_FEE +
                                    8*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low); //check 8

    require(tvm.hash(m_SMVPlatformCode) == platformCodeHash,SMVErrors.error_not_my_code_hash);
    require(m_SMVPlatformCode.depth() == platformCodeDepth, SMVErrors.error_not_my_code_depth);

    require(tvm.hash(m_SMVProposalCode) == proposalCodeHash,SMVErrors.error_not_my_code_hash);
    require(m_SMVProposalCode.depth() == proposalCodeDepth, SMVErrors.error_not_my_code_depth);
    require(block.timestamp <= startTime, SMVErrors.error_time_too_late);
    require(startTime < finishTime, SMVErrors.error_times);
    tvm.accept();
    _saveMsg();
 */

    TvmBuilder staticBuilder;
    uint8 platformType = 1;
    staticBuilder.store(platformType, tip3VotingLocker, propId, platformCodeHash, platformCodeDepth);


    TvmBuilder inputBuilder;
    inputBuilder.storeRef(propData);
    TvmBuilder t;
    t.store(startTime, finishTime, address(this), m_tokenRoot);
    inputBuilder.storeRef(t.toCell());

    uint128 amount = DEFAULT_PROPOSAL_VALUE; //get from Config
    /* TvmSlice s = propData.toSlice();
    (uint256 proposalKind) = s.decode(uint256); */

    TvmSlice s = propData.toSlice();
    TvmSlice propDataSlice = s.loadRefAsSlice();    
    (uint256 proposalKind) = propDataSlice.load(uint256);

    if ((proposalKind == SETCOMMIT_PROPOSAL_KIND) || (proposalKind == DEPLOY_WALLET_DAO_PROPOSAL_KIND)) { amount = 0; }

    ISMVTokenLocker(tip3VotingLocker).startPlatform
                    {value:  SMVConstants.PROPOSAL_INIT_VALUE + num_clients*SMVConstants.CLIENT_LIST_FEE +
                             8*SMVConstants.ACTION_FEE, flag: 1 }
                    (m_SMVPlatformCode, m_SMVProposalCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                             SMVConstants.PROPOSAL_INIT_VALUE + 5*SMVConstants.ACTION_FEE, _goshdao, isTag, _goshdao);

}

function clientAddressForProposal(
  address _tip3VotingLocker,
  uint256 _platform_id
) public view returns(address) {

  TvmBuilder staticBuilder;
  uint8 platformType = 0;
  staticBuilder.store(platformType, _tip3VotingLocker, _platform_id, platformCodeHash, platformCodeDepth);

  TvmCell dc = tvm.buildDataInit ( {contr: LockerPlatform,
                                                 varInit: {  /* tokenLocker: _tip3VotingLocker, */
                                                             platform_id: tvm.hash(staticBuilder.toCell()) } } );
  uint256 addr_std = tvm.stateInitHash(platformCodeHash, tvm.hash(dc), platformCodeDepth, dc.depth());
  return address.makeAddrStd(address(this).wid, addr_std);
}

function calcClientAddress(uint256 _platform_id/*  , address _tokenLocker */) internal view returns(uint256) {
        TvmCell dataCell = tvm.buildDataInit({
            contr: LockerPlatform,
            varInit: {
                /* tokenLocker: _tokenLocker, */
                platform_id: _platform_id
            }
        });
        uint256 dataHash = tvm.hash(dataCell);
        uint16 dataDepth = dataCell.depth();

        uint256 add_std_address = tvm.stateInitHash(
            tvm.hash(m_SMVPlatformCode),
            dataHash,
            m_SMVPlatformCode.depth(),
            dataDepth
        );
        return add_std_address;
    }

function proposalAddressByAccount(address acc, /* uint256 nonce, */ uint256 propId) public view returns(address)
{
    TvmCell dc = tvm.buildDataInit ( {contr: SMVTokenLocker,
                                      varInit: { smvAccount : acc } } );
    uint256 addr_std_locker = tvm.stateInitHash (lockerCodeHash, tvm.hash(dc) , lockerCodeDepth, dc.depth());
    address locker_addr = address.makeAddrStd(address(this).wid, addr_std_locker);

    TvmBuilder staticBuilder;
    uint8 platformType = 1;
    staticBuilder.store(platformType, locker_addr, propId, platformCodeHash, platformCodeDepth);
    return address.makeAddrStd(address(this).wid, calcClientAddress(tvm.hash(staticBuilder.toCell())));
}


function killAccount (address address_to, address /* tokens_to */) external onlyOwnerPubkey(_access.get())
{
    require(!initialized);
    tvm.accept();
    _saveMsg();

    selfdestruct(address_to);
}

/* function withdrawTokens (address address_to, uint128 amount) public onlyOwnerPubkey(_access.get())
{
     require(initialized, SMVErrors.error_not_initialized);
     require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
     tvm.accept();
     _saveMsg();

     TvmCell empty;
     ITokenWallet(m_tokenWallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                          (amount, address_to, 0, address(this), true, empty) ;
} */

function returnExtraLockerFunds() public onlyOwnerPubkey(_access.get())
{
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVTokenLocker(tip3VotingLocker).returnAllButInitBalance {value: SMVConstants.ACTION_FEE, flag: 1} ();
}
}
