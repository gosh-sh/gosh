pragma ton-solidity >= 0.57.0;

library TokenErrors {

    uint16 constant NOT_OWNER                                       = 1000;
    uint16 constant NOT_ROOT                                        = 1010;
    uint16 constant WRONG_ROOT_OWNER                                = 1020;
    uint16 constant WRONG_WALLET_OWNER                              = 1021;
    uint16 constant WRONG_RECIPIENT                                 = 1030;
    uint16 constant NON_ZERO_PUBLIC_KEY                             = 1040;
    uint16 constant WRONG_AMOUNT                                    = 1050;
    uint16 constant NOT_ENOUGH_BALANCE                              = 1060;
    uint16 constant NON_EMPTY_BALANCE                               = 1070;
    uint16 constant SENDER_IS_NOT_VALID_WALLET                      = 1100;

    uint16 constant RECIPIENT_ALLOWS_ONLY_NOTIFIABLE                = 1200;

    uint16 constant LOW_GAS_VALUE                                   = 2000;
    uint16 constant DEPLOY_WALLET_VALUE_TOO_LOW                     = 2010;

    uint16 constant MINT_DISABLED                                   = 2100;

    uint16 constant BURN_DISABLED                                   = 2200;
    uint16 constant BURN_BY_ROOT_DISABLED                           = 2210;
}
