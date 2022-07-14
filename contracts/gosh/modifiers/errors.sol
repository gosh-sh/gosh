// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;

abstract contract Errors {
    string constant versionErrors = "0.5.1";
    
    uint constant ERR_NO_SALT = 200;
    uint constant ERR_SENDER_NOT_DAO = 202;
    uint constant ERR_ZERO_ROOT_KEY = 203;
    uint constant ERR_ZERO_ROOT_GOSH = 206;
    uint constant ERR_LOW_VALUE = 204;
    uint constant ERR_NOT_ROOT_REPO = 205;
    uint constant ERR_INVALID_SENDER = 207;
    uint constant ERR_LOW_BALANCE = 208;
    uint constant ERR_DOUBLE_MSG = 209;
    uint constant ERR_SENDER_NO_ALLOWED = 210;
    uint constant ERR_NO_DATA = 211;
    uint constant ERR_NOT_OWNER = 212;
    uint constant ERR_BRANCH_NOT_EXIST = 213;
    uint constant ERR_NOT_EMPTY_BRANCH = 214;
    uint constant ERR_BRANCH_EXIST = 215;
    uint constant ERR_TOO_MANY_PARENTS = 216;
    uint constant ERR_SECOND_CHANGE = 217;
    uint constant ERR_NOT_LAST_CHECK = 218;
    uint constant ERR_DONT_PASS_CHECK = 219;
    uint constant ERR_WRONG_COMMIT_ADDR = 220;
    uint constant ERR_NEED_PUBKEY = 221;
    uint constant ERR_WRONG_NAME = 222;
    uint constant NOT_ERR = 223;
    uint constant ERR_WRONG_INDEX = 224;
    uint constant ERR_WALLET_NOT_EXIST = 225;
    uint constant ERR_WRONG_BRANCH = 226;
    uint constant ERR_DIFF_ALREADY_USED = 227;
    uint constant ERR_PROCCESS_IS_EXIST = 228;
    uint constant ERR_PROCCESS_END = 229;
    uint constant ERR_NO_NEED_ANSWER = 230;
    uint constant ERR_WRONG_DATA = 231;
    uint constant ERR_NOT_EMPTY_DATA = 232;
}
