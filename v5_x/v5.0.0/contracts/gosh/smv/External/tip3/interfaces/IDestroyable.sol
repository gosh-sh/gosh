pragma ton-solidity >= 0.57.0;

interface IDestroyable {
    function destroy(address remainingGasTo) external;
}
