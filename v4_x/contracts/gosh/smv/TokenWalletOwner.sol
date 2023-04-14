pragma ton-solidity >=0.54.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./External/tip3/interfaces/ITokenRoot.sol";
import "./External/tip3/interfaces/ITokenWallet.sol";
import "./External/tip3/interfaces/IAcceptTokensTransferCallback.sol";
import "./External/tip3/interfaces/IAcceptTokensMintCallback.sol";
import "./External/tip3/interfaces/IBounceTokensTransferCallback.sol";
import "./External/tip3/interfaces/IBounceTokensBurnCallback.sol";


import "./External/tip3/TokenWallet.sol";

contract TokenWalletOwner is IAcceptTokensTransferCallback,
                                     IAcceptTokensMintCallback,
                                     IBounceTokensTransferCallback,
                                     IBounceTokensBurnCallback  {

address public m_tokenRoot;
address public m_tokenWallet;
uint128 public m_tokenBalance;
TvmCell public m_tokenWalletCode;

uint16 constant error_not_my_wallet = 1001;
uint16 constant error_balance_too_low = 1002;
uint16 constant error_not_my_root = 1003;
uint16 constant error_not_external_message = 1004;
uint16 constant error_not_my_pubkey = 1005;


function _buildWalletInitData() internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: TokenWallet,
            varInit: {
                root_: m_tokenRoot,
                owner_: address(this)
            },
            pubkey: 0,
            code: m_tokenWalletCode
        });
    }

modifier check_wallet {
  require ( tvm.hash(_buildWalletInitData()) == msg.sender.value, error_not_my_wallet) ;
  _ ;
}

modifier check_token_root {
  require ( msg.sender == m_tokenRoot, error_not_my_root) ;
  _ ;
}

modifier check_owner virtual {
  require ( msg.pubkey () != 0, error_not_external_message );
  require ( tvm.pubkey () == msg.pubkey (), error_not_my_pubkey );
  _ ;
}

function onAcceptTokensMint (address /* tokenRoot */,
                             uint128 amount,
                             address gasTo,
                             TvmCell /* payload */) external override check_wallet
{
    m_tokenBalance += amount;
    gasTo.transfer(0, true, 64);
}

function onBounceTokensBurn(
        address /* tokenRoot */,
        uint128 amount
    ) external override check_wallet
{
    m_tokenBalance += amount;
}

function onBounceTokensTransfer(address /* root */, uint128 amount, address /* wallet_to */) external override check_wallet
{
    m_tokenBalance += amount;
}

function onAcceptTokensTransfer (address /* tokenRoot */,
                                 uint128 amount,
                                 address /* sender */,
                                 address /* sender_wallet */,
                                 address gasTo,
                                 TvmCell /* payload */) external override check_wallet
{
    m_tokenBalance += amount;
    gasTo.transfer(0, true, 64);
}



function updateTokenBalance() external view check_owner
{
  require (address(this).balance >= 0.3 ton, error_balance_too_low);
  require(!m_tokenWallet.isStdZero());
  require(!m_tokenRoot.isStdZero());

  tvm.accept();

  ITokenWallet(m_tokenWallet).balance {value: 0.2 ton,
                                     flag: 1,
                                     callback: TokenWalletOwner.onUpdateBalance} ();
}

function onUpdateBalance(uint128 amount) external check_wallet {
    m_tokenBalance = amount;
}



}