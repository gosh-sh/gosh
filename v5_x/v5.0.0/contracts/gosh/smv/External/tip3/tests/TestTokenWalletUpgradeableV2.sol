pragma ton-solidity >= 0.57.0;

import "../TokenWalletUpgradeable.sol";


contract TestTokenWalletUpgradeableV2 is TokenWalletUpgradeable {

    function onlyInV2() public pure responsible returns (string) {
        return "Some method in wallet v2";
    }

}
