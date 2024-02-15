pragma ton-solidity >= 0.57.0;

import "../TokenRootUpgradeable.sol";


contract TestTokenRootUpgradeableV2 is TokenRootUpgradeable {

    constructor(
        address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo
    ) public TokenRootUpgradeable(
        initialSupplyTo,
        initialSupply,
        deployWalletValue,
        mintDisabled,
        burnByRootDisabled,
        burnPaused,
        remainingGasTo
    ) {}

    function onlyInV2() public pure responsible returns (string) {
        return "Some method in root v2";
    }

}
