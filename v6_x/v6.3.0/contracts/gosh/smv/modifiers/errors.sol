// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

abstract contract Errors {
    string constant versionErrors = "6.3.0";
    
    uint16 constant ERR_NO_SALT = 200;
    uint16 constant ERR_SENDER_NOT_DAO = 202;
    uint16 constant ERR_ZERO_ROOT_KEY = 203;
    uint16 constant ERR_ZERO_ROOT_GOSH = 206;
    uint16 constant ERR_LOW_VALUE = 204;
    uint16 constant ERR_NOT_ROOT_REPO = 205;
    uint16 constant ERR_INVALID_SENDER = 207;
    uint16 constant ERR_LOW_BALANCE = 208;
    uint16 constant ERR_DOUBLE_MSG = 209;
    uint16 constant ERR_SENDER_NO_ALLOWED = 210;
    uint16 constant ERR_NO_DATA = 211;
    uint16 constant ERR_NOT_OWNER = 212;
    uint16 constant ERR_BRANCH_NOT_EXIST = 213;
    uint16 constant ERR_NOT_EMPTY_BRANCH = 214;
    uint16 constant ERR_BRANCH_EXIST = 215;
    uint16 constant ERR_TOO_MANY_PARENTS = 216;
    uint16 constant ERR_SECOND_CHANGE = 217;
    uint16 constant ERR_NOT_LAST_CHECK = 218;
    uint16 constant ERR_DONT_PASS_CHECK = 219;
    uint16 constant ERR_WRONG_COMMIT_ADDR = 220;
    uint16 constant ERR_NEED_PUBKEY = 221;
    uint16 constant ERR_WRONG_NAME = 222;
    uint16 constant NOT_ERR = 223;
    uint16 constant ERR_WRONG_INDEX = 224;
    uint16 constant ERR_WALLET_NOT_EXIST = 225;
    uint16 constant ERR_WRONG_BRANCH = 226;
    uint16 constant ERR_DIFF_ALREADY_USED = 227;
    uint16 constant ERR_PROCCESS_IS_EXIST = 228;
    uint16 constant ERR_PROCCESS_END = 229;
    uint16 constant ERR_NO_NEED_ANSWER = 230;
    uint16 constant ERR_WRONG_DATA = 231;
    uint16 constant ERR_NOT_EMPTY_DATA = 232;
    uint16 constant ERR_SNAPSHOT_NOT_READY = 233;
    uint16 constant ERR_EMPTY_BRANCH = 234;
    uint16 constant ERR_GOSH_UPDATE = 235;
    uint16 constant ERR_OLD_CONTRACT = 236;
    uint16 constant ERR_SYSTEM_CONTRACT_BAD_VERSION = 237;
    uint16 constant ERR_BAD_COUNT_PARENTS = 238;
    uint16 constant ERR_REPOSITORY_NOT_READY = 239;
    uint16 constant ERR_PREV_NOT_EXIST = 240;
    uint16 constant ERR_WRONG_DAO = 241;
    uint16 constant ERR_TOMBSTONE = 242;
    uint16 constant ERR_BAD_NUMBER_CUSTODIANS = 243;
    uint16 constant ERR_NOTHING_TO_CONFIRM = 244;
    uint16 constant ERR_ALREADY_CONFIRMED = 245;
    uint16 constant ERR_WRONG_NUMBER_MEMBER = 246;
    uint16 constant ERR_BAD_PARENT = 247;
    uint16 constant ERR_TOO_LOW_BALANCE = 248;
    uint16 constant ERR_FIRST_DAO = 249;
    uint16 constant ERR_MESSAGE_EXPIRED = 250;
    uint16 constant ERR_MESSAGE_WITH_HUGE_EXPIREAT = 251;
    uint16 constant ERR_MESSAGE_IS_EXIST = 252;
    uint16 constant ERR_TOO_MANY_DIFFS = 253; 
    uint16 constant ERR_CONTRACT_BAD_VERSION = 254;  
    uint16 constant ERR_NOT_ALONE = 255;   
    uint16 constant ERR_TASK_COMPLETED = 256;   
    uint16 constant ERR_TASK_NOT_COMPLETED = 257;   
    uint16 constant ERR_ASSIGN_NOT_EXIST = 258; 
    uint16 constant ERR_REVIEW_NOT_EXIST = 259; 
    uint16 constant ERR_MANAGER_NOT_EXIST = 260; 
    uint16 constant ERR_NEED_SMV = 261;
    uint16 constant ERR_BRANCH_PROTECTED = 262;
    uint16 constant ERR_WALLET_LIMITED = 263;
    uint16 constant ERR_LOW_TOKEN_RESERVE = 264;
    uint16 constant ERR_LOW_TOKEN = 265;
    uint16 constant ERR_TOO_MANY_TAGS = 266;
    uint16 constant ERR_NOT_READY = 267;
    uint16 constant ERR_NOT_ALLOW_MINT = 268;
    uint16 constant ERR_DIFFERENT_COUNT = 269;
    uint16 constant ERR_TOO_MANY_VESTING_TIME = 270;
    uint16 constant ERR_ZERO_GRANT = 271;
    uint16 constant ERR_WRONG_LOCK = 272;
    uint16 constant ERR_TOO_MANY_PROPOSALS = 273;
    uint16 constant ERR_TOO_FEW_PROPOSALS = 274;
    uint16 constant ERR_WRONG_UPGRADE_STATUS = 275;
    uint16 constant ERR_WALLET_EXIST = 276;
    uint16 constant ERR_PROGRAM_EXIST = 277;
    uint16 constant ERR_PROGRAM_NOT_EXIST = 278;
}
