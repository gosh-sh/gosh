pragma ton-solidity >= 0.57.0;

interface TIP3TokenWallet {
    function root() external view responsible returns (address);
    function balance() external view responsible returns (uint128);
    function walletCode() external view responsible returns (TvmCell);
}
