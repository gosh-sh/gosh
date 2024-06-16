pragma ton-solidity >= 0.57.0;


interface ITokenFactory {

    function deployRoot(
        string name,                    // static
        string symbol,                  // static
        uint8 decimals,                 // static
        address owner,                  // static
        address initialSupplyTo,        // constructor
        uint128 initialSupply,          // constructor
        uint128 deployWalletValue,      // constructor
        bool mintDisabled,              // constructor
        bool burnByRootDisabled,        // constructor
        bool burnPaused,                // constructor
        address remainingGasTo,         // constructor
        bool upgradeable
    ) external responsible returns (address);

}
