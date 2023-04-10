pragma ton-solidity >= 0.57.0;


interface IVersioned {
    function version() external view responsible returns (uint32);
}
