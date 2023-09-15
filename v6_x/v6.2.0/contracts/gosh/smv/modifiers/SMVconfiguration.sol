// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "./replayprotection.sol";
import "./structs/structs.sol";


abstract contract SMVConfiguration is ReplayProtection {   
    string constant versionSMVCONF = "6.2.0";

    //SMV configuration
    uint32 constant PROPOSAL_START_AFTER  = 0 seconds;
    uint32 constant PROPOSAL_DURATION  = 1 weeks; 

    uint256 constant SETCOMMIT_PROPOSAL_KIND = 1;
    uint256 constant ADD_PROTECTED_BRANCH_PROPOSAL_KIND = 2;
    uint256 constant DELETE_PROTECTED_BRANCH_PROPOSAL_KIND = 3;
    uint256 constant SET_TOMBSTONE_PROPOSAL_KIND = 4;
    uint256 constant DEPLOY_WALLET_DAO_PROPOSAL_KIND = 5;
    uint256 constant DELETE_WALLET_DAO_PROPOSAL_KIND = 6;
    uint256 constant SET_UPGRADE_PROPOSAL_KIND = 7;
//    uint256 constant CHANGE_TOKEN_CONFIG_PROPOSAL_KIND = 8;
    uint256 constant BIGTASK_PROPOSAL_KIND = 9;
    uint256 constant TASK_DESTROY_PROPOSAL_KIND = 10;
    uint256 constant TASK_DEPLOY_PROPOSAL_KIND = 11;
    uint256 constant DEPLOY_REPO_PROPOSAL_KIND = 12;
    uint256 constant ADD_VOTE_TOKEN_PROPOSAL_KIND = 13;
    uint256 constant ADD_REGULAR_TOKEN_PROPOSAL_KIND = 14;
    uint256 constant MINT_TOKEN_PROPOSAL_KIND = 15;
    uint256 constant DAOTAG_PROPOSAL_KIND = 16;
    uint256 constant DAOTAG_DESTROY_PROPOSAL_KIND = 17;
    uint256 constant ALLOW_MINT_PROPOSAL_KIND = 18;
    uint256 constant CHANGE_ALLOWANCE_PROPOSAL_KIND = 19;
    uint256 constant MULTI_PROPOSAL_KIND = 20;
    uint256 constant REPOTAG_PROPOSAL_KIND = 21;
    uint256 constant REPOTAG_DESTROY_PROPOSAL_KIND = 22;
    uint256 constant CHANGE_DESCRIPTION_PROPOSAL_KIND = 23;
    uint256 constant CHANGE_ALLOW_DISCUSSION_PROPOSAL_KIND = 24;
    uint256 constant CHANGE_HIDE_VOTING_PROPOSAL_KIND = 25;
    uint256 constant TAG_UPGRADE_PROPOSAL_KIND = 26;
    uint256 constant ABILITY_INVITE_PROPOSAL_KIND = 27;
    uint256 constant DAO_VOTE_PROPOSAL_KIND = 28;
    uint256 constant MULTI_AS_DAO_PROPOSAL_KIND = 29;
    uint256 constant DELAY_PROPOSAL_KIND = 30;
    uint256 constant SEND_TOKEN_PROPOSAL_KIND = 31;
    uint256 constant UPGRADE_CODE_PROPOSAL_KIND = 32;
    uint256 constant REVIEW_CODE_PROPOSAL_KIND = 33;
    uint256 constant ASK_TASK_GRANT_PROPOSAL_KIND = 34;
    uint256 constant DAO_LOCK_PROPOSAL_KIND = 35;
    uint256 constant TASK_REDEPLOY_PROPOSAL_KIND = 36;
    uint256 constant TASK_REDEPLOYED_PROPOSAL_KIND = 37;
    uint256 constant TASK_UPGRADE_PROPOSAL_KIND = 38;
    uint256 constant TRANSFER_TO_NEW_VERSION_PROPOSAL_KIND = 39;
    uint256 constant START_PAID_MEMBERSHIP_PROPOSAL_KIND = 40;
    uint256 constant STOP_PAID_MEMBERSHIP_PROPOSAL_KIND = 41;
    uint256 constant BIGTASK_DESTROY_PROPOSAL_KIND = 42;
    uint256 constant BIGTASK_DEPLOY_PROPOSAL_KIND = 43;
    uint256 constant BIGTASK_UPGRADE_PROPOSAL_KIND = 44;
    uint256 constant INDEX_PROPOSAL_KIND = 45;
}