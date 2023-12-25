// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

abstract contract Errors {
    string constant versionErrors = "0.0.1";
    
    uint16 constant ERR_MESSAGE_EXPIRED = 300;
    uint16 constant ERR_MESSAGE_WITH_HUGE_EXPIREAT = 301;
    uint16 constant ERR_MESSAGE_IS_EXIST = 302;    
    uint16 constant ERR_NOT_OWNER = 303;
    uint16 constant ERR_INVALID_SENDER = 304;
    uint16 constant ERR_LOW_BALANCE = 305;
    uint16 constant ERR_LOW_VALUE = 306;
    uint16 constant ERR_SENDER_NO_ALLOWED = 307;
    uint16 constant ERR_NOT_ENOUGH_KARMA = 308;
}
