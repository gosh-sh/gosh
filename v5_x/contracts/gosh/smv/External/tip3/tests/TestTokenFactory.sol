pragma ton-solidity >= 0.57.0;

import "../additional/TokenFactory.sol";


contract TestTokenFactory is TokenFactory {

    constructor(
        address owner,
        uint128 deployValue,
        TvmCell rootCode,
        TvmCell walletCode,
        TvmCell rootUpgradeableCode,
        TvmCell walletUpgradeableCode,
        TvmCell platformCode
    ) public TokenFactory(owner, deployValue, rootCode, walletCode, rootUpgradeableCode, walletUpgradeableCode, platformCode) {}

    function deployRootTest(
        string name,
        string symbol,
        uint8 decimals,
        address owner,
        address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo,
        bool upgradeable
    ) external responsible returns (address) {
        tvm.accept();
        function (uint256, string, string, uint8, address) returns (TvmCell) buildStateInit =
            upgradeable ? _buildUpgradeableStateInit : _buildCommonStateInit;
        TvmCell stateInit = buildStateInit(_tokenNonce++, name, symbol, decimals, owner);
        address root = new TokenRoot {
            value: _deployValue,
            flag: TokenMsgFlag.SENDER_PAYS_FEES,
            bounce: false,
            stateInit: stateInit
        }(
            initialSupplyTo,
            initialSupply,
            deployWalletValue,
            mintDisabled,
            burnByRootDisabled,
            burnPaused,
            remainingGasTo
        );
        return {value: 0, flag: TokenMsgFlag.SENDER_PAYS_FEES, bounce: false} root;
    }

}
