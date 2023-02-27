pragma ton-solidity >= 0.57.0;

library TokenMsgFlag {
    uint8 constant SENDER_PAYS_FEES     = 1;
    uint8 constant IGNORE_ERRORS        = 2;
    uint8 constant DESTROY_IF_ZERO      = 32;
    uint8 constant REMAINING_GAS        = 64;
    uint8 constant ALL_NOT_RESERVED     = 128;
}
