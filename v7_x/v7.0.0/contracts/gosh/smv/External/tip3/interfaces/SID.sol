pragma ton-solidity >= 0.57.0;

interface SID {
    /// @notice Query if a contract implements an interface
    /// @param interfaceID The interface identifier, as specified in TIP6.1
    /// @dev Interface identification is specified in TIP6.1.
    /// @return `true` if the contract implements `interfaceID` and
    ///  `interfaceID` is not 0xffffffff, `false` otherwise
    function supportsInterface(bytes4 interfaceID) external view responsible returns (bool);
}
