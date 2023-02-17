pragma ton-solidity >= 0.57.0;

import "./ITokenWallet.sol";
import "./IVersioned.sol";


interface ITokenWalletUpgradeable is ITokenWallet, IVersioned {
    function platformCode() external view responsible returns (TvmCell);
    function upgrade(address remainingGasTo) external;
    function acceptUpgrade(TvmCell code, uint32 newVersion, address remainingGasTo) external;
}
