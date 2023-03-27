pragma ton-solidity >= 0.57.0;

interface ICallbackParamsStructure {
    struct CallbackParams {
        uint128 value;
        TvmCell payload;
    }
}
