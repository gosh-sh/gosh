pragma ton-solidity >= 0.57.0;

interface TIP3TokenRoot {
    function name() external view responsible returns (string);
    function symbol() external view responsible returns (string);
    function decimals() external view responsible returns (uint8);
    function totalSupply() external view responsible returns (uint128);
    function walletCode() external view responsible returns (TvmCell);
}
