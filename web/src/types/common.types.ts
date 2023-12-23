export type TToastStatus = {
  type: 'pending' | 'error' | 'success' | 'dismiss' | null
  data: any
}

export enum EDaoEventType {
  PULL_REQUEST = 1,
  BRANCH_LOCK = 2,
  BRANCH_UNLOCK = 3,
  DAO_MEMBER_ADD = 5,
  DAO_MEMBER_DELETE = 6,
  DAO_UPGRADE = 7,
  DAO_CONFIG_CHANGE = 8,
  MILESTONE_COMPLETE = 9,
  TASK_DELETE = 10,
  TASK_CREATE = 11,
  REPO_CREATE = 12,
  DAO_TOKEN_VOTING_ADD = 13,
  DAO_TOKEN_REGULAR_ADD = 14,
  DAO_TOKEN_MINT = 15,
  DAO_TAG_ADD = 16,
  DAO_TAG_REMOVE = 17,
  DAO_TOKEN_MINT_DISABLE = 18,
  DAO_ALLOWANCE_CHANGE = 19,
  MULTI_PROPOSAL = 20,
  REPO_TAG_ADD = 21,
  REPO_TAG_REMOVE = 22,
  REPO_UPDATE_DESCRIPTION = 23,
  DAO_EVENT_ALLOW_DISCUSSION = 24,
  DAO_EVENT_HIDE_PROGRESS = 25,
  REPO_TAG_UPGRADE = 26,
  DAO_ASK_MEMBERSHIP_ALLOWANCE = 27,
  DAO_VOTE = 28,
  MULTI_PROPOSAL_AS_DAO = 29,
  DELAY = 30,
  DAO_TOKEN_DAO_SEND = 31,
  UPGRADE_VERSION_CONTROLLER = 32,
  DAO_REVIEWER = 33,
  DAO_RECEIVE_BOUNTY = 34,
  DAO_TOKEN_DAO_LOCK = 35,
  TASK_REDEPLOY = 36,
  TASK_REDEPLOYED = 37,
  TASK_UPGRADE = 38,
  DAO_TOKEN_TRANSFER_FROM_PREV = 39,
  DAO_START_PAID_MEMBERSHIP = 40,
  DAO_STOP_PAID_MEMBERSHIP = 41,
  MILESTONE_DELETE = 42,
  MILESTONE_CREATE = 43,
  MILESTONE_UPGRADE = 44,
  REPO_DELETE = 46,
  DAO_EXPERT_TAG_CREATE = 47,
  DAO_EXPERT_TAG_DELETE = 48,
  DAO_MEMBER_EXPERT_TAG_CREATE = 49,
  DAO_MEMBER_EXPERT_TAG_DELETE = 50,
  HACKATHON_CREATE = 51,
  HACKATHON_APPS_APPROVE = 53,
  HACKATHON_UPDATE = 54,
  BRANCH_CREATE = 56,
}
