pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./External/tip3/TokenWallet.sol";
import "./External/tip3/TokenRoot.sol";


/*
    @title Fungible token root's owner contract
*/
contract TokenRootOwner is IAcceptTokensTransferCallback {
    uint256 static nonce;
    TvmCell m_tokenRootCode;
    TvmCell m_tokenWalletCode;
    uint256 _rootpubkey;


    struct ProjectCurrencyInfo {
        address ProjectTokenRoot;
        address ReverueTokenRoot;
        address RevenueTokenWallet;
    }

    mapping(address => ProjectCurrencyInfo) public projectTokens; // ProjectTokenWallet => ProjectCurrencyInfo

    function onAcceptTokensTransfer(
        address /* tokenRoot */,
        uint128 /* amount */,
        address /* sender */,
        address /* senderWallet */,
        address /* remainingGasTo */,
        TvmCell /* payload */
    ) override external {
        revert();
    }

    function createProjectCurrencies() external view {
        require(_rootpubkey != 0, 100);
        require(msg.pubkey() == _rootpubkey, 101);
        tvm.accept();


    }

    constructor (
        TvmCell _tokenRootCode,
        TvmCell _tokenWalletCode
    ) {
        /* require(_rootpubkey != 0, 100);
        require(msg.pubkey() == _rootpubkey, 101);
        tvm.accept(); */
        tvm.accept();
        _rootpubkey =  tvm.pubkey();
        m_tokenRootCode = _tokenRootCode;
        m_tokenWalletCode = _tokenWalletCode;
    }

    function deployRoot(
        address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo,
        uint256 randomNonce
    ) external view returns (address) {

        require(msg.pubkey() == _rootpubkey, 101);
        tvm.accept();

        return _deployRoot(
            initialSupplyTo,
            initialSupply,
            deployWalletValue,
            mintDisabled,
            burnByRootDisabled,
            burnPaused,
            remainingGasTo,
            randomNonce
        );
    }

    function _deployRoot(
        address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo,
        uint256 randomNonce
    ) inline internal view returns (address) {
        return new TokenRoot{
            value: 15 ton,
            varInit: {
                randomNonce_: randomNonce,
                deployer_: this,
                name_: "",
                symbol_: "",
                decimals_: 1,
                rootOwner_: this,
                walletCode_: m_tokenWalletCode
            },
            code: m_tokenRootCode
        }(
            initialSupplyTo,
            initialSupply,
            deployWalletValue,
            mintDisabled,
            burnByRootDisabled,
            burnPaused,
            remainingGasTo
        );
    }

    address public lastWalletDeployed;

    /* function deployTokenWallet(
        address tokenRoot,
        address walletOwner,
        uint128 deployWalletValue
    ) external {

        require(msg.pubkey() == _rootpubkey, 101);
        tvm.accept();

        lastWalletDeployed = _deployTokenWallet(tokenRoot, walletOwner, deployWalletValue);
    }

    function _deployTokenWallet(
        address tokenRoot,
        address walletOwner,
        uint128 deployWalletValue
    ) inline internal returns (address) {
        return ITokenRoot(tokenRoot).deployWallet{value: deployWalletValue + 10 ton}(
            walletOwner,
            deployWalletValue
        ).await;
    } */

    function callback(address res) public {
        lastWalletDeployed = res;
    }

    function mint(
        address tokenRoot,
        uint128 amount,
        address recipient,
        uint128 deployWalletValue,
        address remainingGasTo ,
        bool notify,
        TvmCell payload
    ) external view {

        require(msg.pubkey() == _rootpubkey, 101);
        tvm.accept();

        ITokenRoot(tokenRoot).mint{value: 10 ton}(
            amount,
            recipient,
            deployWalletValue,
            remainingGasTo,
            notify,
            payload
        );
    }
}
