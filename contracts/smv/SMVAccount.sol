pragma ton-solidity >=0.54.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../gosh/modifiers/modifiers.sol";


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
import "TokenWalletOwner.sol";

contract SMVAccount is Modifiers, ISMVAccount , TokenWalletOwner {

uint256 /* static */ nonce;

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

    mapping(uint32 => mapping(uint256 => bool)) messages;
    // Iteration count for cleaning mapping `messages`
    uint8 constant MAX_CLEANUP_ITERATIONS = 20;
    // Information about the last message
    MessageInfo lastMessage;
    // Dummy variable to demonstrate contract functionality.
    uint __value;
    
    
modifier saveMsg() {
    _saveMsg();
    _;
}

function _saveMsg() inline internal {
    gc();
    messages[lastMessage.expireAt][lastMessage.messageHash] = true;
}
    
    // Colls a function body and then gc()
    modifier clear {
        _;
        gc();
    }
    
    // Function with predefined name which is used to replace custom replay protection.
    function afterSignatureCheck(TvmSlice body, TvmCell message) private inline returns (TvmSlice) {
        body.decode(uint64); // The first 64 bits contain timestamp which is usually used to differentiate messages.
        // check expireAt
        uint32 expireAt = body.decode(uint32);
        require(expireAt > now, 101);   // Check whether the message is not expired.
        require(expireAt < now + 5 minutes, 102); // Check whether expireAt is not too huge.

        // Check whether the message is not expired and then save (messageHash, expireAt) in the state variable
        uint messageHash = tvm.hash(message);
        optional(mapping(uint256 => bool)) m = messages.fetch(expireAt);
        require(!m.hasValue() || !m.get()[expireAt], 103);
        lastMessage = MessageInfo({messageHash: messageHash, expireAt: expireAt});

        // After reading message headers this function must return the rest of the body slice.
        return body;
    }
    
       /// Delete expired messages from `messages`.
    function gc() private {
        uint counter = 0;
        for ((uint32 expireAt, mapping(uint256 => bool) m) : messages) {
            m; // suspend compilation warning
            if (counter >= MAX_CLEANUP_ITERATIONS) {
                break;
            }
            counter++;
            if (expireAt <= now) {
                delete messages[expireAt];
            } else {
                break;
            }
        }
    }

modifier check_owner override {
  require ( msg.pubkey () != 0, SMVErrors.error_not_external_message );
  require ( tvm.pubkey () == msg.pubkey (), SMVErrors.error_not_my_pubkey );
  _ ;
}

modifier check_locker {
  require ( msg.sender == tip3VotingLocker, SMVErrors.error_not_my_locker) ;
  _ ;
}

constructor(TvmCell lockerCode, TvmCell tokenWalletCode,
            uint256 _platformCodeHash, uint16 _platformCodeDepth,
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
    m_tokenRoot = _tip3Root;
    m_tokenWalletCode = tokenWalletCode;
    ITokenRoot(m_tokenRoot).deployWallet {value: SMVConstants.TIP3_WALLET_DEPLOY_VALUE + SMVConstants.TIP3_WALLET_INIT_VALUE,
                                          flag: 1,
                                          callback: SMVAccount.onTokenWalletDeployed} (address(this), SMVConstants.TIP3_WALLET_INIT_VALUE);

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

    m_tokenWallet = address.makeAddrStd(0,tvm.hash(_buildWalletInitData()));

    tip3VotingLocker = new SMVTokenLocker { value: SMVConstants.LOCKER_INIT_VALUE +
                                                   SMVConstants.ACTION_FEE,
                                            stateInit:_stateInit } (platformCodeHash, platformCodeDepth, m_tokenWalletCode, m_tokenRoot);
}

function onTokenWalletDeployed(address wallet) external view check_token_root
{
  require (wallet == m_tokenWallet);
}

function proposalIsCompleted(address proposal) external onlyOwnerPubkey(_access.get()) {
    tvm.accept();
    _saveMsg();

    ISMVProposal(proposal).isCompleted{
      value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.EPSILON_FEE
    }();
}
/* 
function isCompletedCallback (uint256 , address , optional (bool) votingResult, TvmCell ) public  
{
     lastVoteResult = votingResult;
 }

 */
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

function lockVoting (uint128 amount) external onlyOwnerPubkey(_access.get())
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    if (amount == 0) {amount = m_tokenBalance;}

    if ((amount > 0) && (amount <= m_tokenBalance))
    {
        TvmCell empty;
        ITokenWallet(m_tokenWallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                          (amount, tip3VotingLocker, 0, address(this), true, empty) ;
        m_tokenBalance = m_tokenBalance - amount;
    }
}

function unlockVoting (uint128 amount) external  onlyOwnerPubkey(_access.get())
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
function voteFor (/* TvmCell platformCode, TvmCell clientCode, */ uint256 platform_id, bool choice, uint128 amount, uint128 num_clients) external  onlyOwnerPubkey(_access.get())
{
    require(initialized, SMVErrors.error_not_initialized);
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    2*SMVConstants.VOTING_FEE + num_clients*SMVConstants.CLIENT_LIST_FEE +
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE +
                                    9*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low+2000);

/*     require(tvm.hash(platformCode) == platformCodeHash,SMVErrors.error_not_my_code_hash);
    require(platformCode.depth() == platformCodeDepth, SMVErrors.error_not_my_code_depth);

    require(tvm.hash(clientCode) == clientCodeHash,SMVErrors.error_not_my_code_hash);
    require(clientCode.depth() == clientCodeDepth, SMVErrors.error_not_my_code_depth);
 */    tvm.accept();
    _saveMsg();

    TvmBuilder staticBuilder;
    uint8 platformType = 0;
    staticBuilder.store(platformType, tip3VotingLocker, platform_id, platformCodeHash, platformCodeDepth);

    TvmBuilder inputBuilder;
    inputBuilder.store(choice);

    ISMVTokenLocker(tip3VotingLocker).startPlatform
                    {value:  2*SMVConstants.VOTING_FEE  + num_clients*SMVConstants.CLIENT_LIST_FEE +
                             SMVConstants.CLIENT_INIT_VALUE +
                             SMVConstants.PROP_INITIALIZE_FEE +
                             8*SMVConstants.ACTION_FEE, flag: 1 }
                    (m_SMVPlatformCode, m_SMVClientCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE + 5*SMVConstants.ACTION_FEE);
}

function getPlatfotmId (uint256 propId, uint8 platformType, address _tip3VotingLocker) public view returns (uint256)
{
    TvmBuilder staticBuilder;
/*     uint8 platformType = 1;
 */    staticBuilder.store(platformType, _tip3VotingLocker, propId, platformCodeHash, platformCodeDepth);
    return tvm.hash(staticBuilder.toCell());
}

function startProposal (/* TvmCell platformCode, TvmCell proposalCode, */ uint256 propId, TvmCell propData,
                        uint32 startTime, uint32 finishTime, uint128 num_clients) internal view /* public check_owner */
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
    require(now <= startTime, SMVErrors.error_time_too_late);
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

    uint128 amount = 20; //get from Config

    ISMVTokenLocker(tip3VotingLocker).startPlatform
                    {value:  SMVConstants.PROPOSAL_INIT_VALUE + num_clients*SMVConstants.CLIENT_LIST_FEE +
                             8*SMVConstants.ACTION_FEE, flag: 1 }
                    (m_SMVPlatformCode, m_SMVProposalCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                             SMVConstants.PROPOSAL_INIT_VALUE + 5*SMVConstants.ACTION_FEE);

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

function withdrawTokens (address address_to, uint128 amount) public onlyOwnerPubkey(_access.get())
{
     require(initialized, SMVErrors.error_not_initialized);
     require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
     tvm.accept();
     _saveMsg();

     TvmCell empty;
     ITokenWallet(m_tokenWallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
                                          (amount, address_to, 0, address(this), true, empty) ;
}

function updateHead() public onlyOwnerPubkey(_access.get())
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

function returnExtraLockerFunds() public onlyOwnerPubkey(_access.get())
{
    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    tvm.accept();
    _saveMsg();

    ISMVTokenLocker(tip3VotingLocker).returnAllButInitBalance {value: SMVConstants.ACTION_FEE, flag: 1} ();
}
}
