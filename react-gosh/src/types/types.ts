import {
    TDaoAskMembershipAllowanceParams,
    TDaoEventAllowDiscussionParams,
    TDaoEventShowProgressParams,
    TDaoMemberAllowanceUpdateParams,
    TDaoMemberCreateParams,
    TDaoMemberDeleteParams,
    TDaoMintDisableParams,
    TDaoMintTokenParams,
    TDaoRegularTokenAddParams,
    TDaoReviewParams,
    TDaoTagCreateParams,
    TDaoTagDeleteParams,
    TDaoTokenDaoSendParams,
    TDaoTokenDaoLockParams,
    TDaoUpgradeParams,
    TDaoVoteParams,
    TDaoVotingTokenAddParams,
    TTaskCreateParams,
    TTaskDeleteParams,
    TTaskReceiveBountyDaoParams,
    TTaskUpgradeCompleteParams,
    TTaskTransferParams,
    TUserParam,
    TTaskUpgradeParams,
} from './dao.types'
import {
    TRepositoryChangeBranchProtectionParams,
    TRepositoryCreateParams,
    TRepositoryTagCreateParams,
    TRepositoryTagDeleteParams,
    TRepositoryUpdateDescriptionParams,
} from './repo.types'
import { ESmvEventType } from './smv.types'

type TAddress = string

type TPaginatedAccountsResult = {
    results: any[]
    lastId?: string
    completed: boolean
}

type TValidationResult = {
    valid: boolean
    reason?: string
}

type TEventCreateParams = {
    comment?: string
    reviewers?: TUserParam[]
}

type TEventMultipleCreateProposalParams = TEventCreateParams & {
    proposals: (
        | {
              type: ESmvEventType.REPO_CREATE
              params: TRepositoryCreateParams
          }
        | {
              type: ESmvEventType.BRANCH_LOCK
              params: TRepositoryChangeBranchProtectionParams
          }
        | {
              type: ESmvEventType.BRANCH_UNLOCK
              params: TRepositoryChangeBranchProtectionParams
          }
        | {
              type: ESmvEventType.DAO_MEMBER_ADD
              params: TDaoMemberCreateParams
          }
        | {
              type: ESmvEventType.DAO_MEMBER_DELETE
              params: TDaoMemberDeleteParams
          }
        | {
              type: ESmvEventType.DAO_UPGRADE
              params: TDaoUpgradeParams
          }
        | {
              type: ESmvEventType.TASK_CREATE
              params: TTaskCreateParams
          }
        | {
              type: ESmvEventType.TASK_DELETE
              params: TTaskDeleteParams
          }
        | {
              type: ESmvEventType.DAO_TOKEN_VOTING_ADD
              params: TDaoVotingTokenAddParams
          }
        | {
              type: ESmvEventType.DAO_TOKEN_REGULAR_ADD
              params: TDaoRegularTokenAddParams
          }
        | {
              type: ESmvEventType.DAO_TOKEN_MINT
              params: TDaoMintTokenParams
          }
        | {
              type: ESmvEventType.DAO_TOKEN_MINT_DISABLE
              params: TDaoMintDisableParams
          }
        | {
              type: ESmvEventType.DAO_TAG_ADD
              params: TDaoTagCreateParams
          }
        | {
              type: ESmvEventType.DAO_TAG_REMOVE
              params: TDaoTagDeleteParams
          }
        | {
              type: ESmvEventType.DAO_ALLOWANCE_CHANGE
              params: TDaoMemberAllowanceUpdateParams
          }
        | {
              type: ESmvEventType.REPO_TAG_ADD
              params: TRepositoryTagCreateParams
          }
        | {
              type: ESmvEventType.REPO_TAG_REMOVE
              params: TRepositoryTagDeleteParams
          }
        | {
              type: ESmvEventType.REPO_UPDATE_DESCRIPTION
              params: TRepositoryUpdateDescriptionParams
          }
        | {
              type: ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION
              params: TDaoEventAllowDiscussionParams
          }
        | {
              type: ESmvEventType.DAO_EVENT_HIDE_PROGRESS
              params: TDaoEventShowProgressParams
          }
        | {
              type: ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE
              params: TDaoAskMembershipAllowanceParams
          }
        | {
              type: ESmvEventType.DELAY
              params: object
          }
        | {
              type: ESmvEventType.DAO_TOKEN_DAO_SEND
              params: TDaoTokenDaoSendParams
          }
        | {
              type: ESmvEventType.TASK_REDEPLOY
              params: TTaskTransferParams
          }
        | {
              type: ESmvEventType.TASK_REDEPLOYED
              params: TTaskUpgradeCompleteParams
          }
        | {
              type: ESmvEventType.DAO_VOTE
              params: TDaoVoteParams
          }
        | {
              type: ESmvEventType.DAO_REVIEWER
              params: TDaoReviewParams
          }
        | {
              type: ESmvEventType.DAO_RECEIVE_BOUNTY
              params: TTaskReceiveBountyDaoParams
          }
        | {
              type: ESmvEventType.DAO_TOKEN_DAO_LOCK
              params: TDaoTokenDaoLockParams
          }
        | {
              type: ESmvEventType.TASK_UPGRADE
              params: TTaskUpgradeParams
          }
    )[]
}

type TEventMultipleCreateProposalAsDaoParams = TEventMultipleCreateProposalParams & {
    wallet: TAddress
    reviewersBase?: TUserParam[]
}

export {
    TAddress,
    TEventMultipleCreateProposalParams,
    TEventMultipleCreateProposalAsDaoParams,
    TPaginatedAccountsResult,
    TEventCreateParams,
    TValidationResult,
}
