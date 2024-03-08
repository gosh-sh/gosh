import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Dao } from '../blockchain/dao'
import { DaoEvent } from '../blockchain/daoevent'
import { DaoWallet } from '../blockchain/daowallet'
import { Milestone } from '../blockchain/milestone'
import { GoshRepository } from '../blockchain/repository'
import { Task } from '../blockchain/task'
import { UserProfile } from '../blockchain/userprofile'
import { TGoshCommit } from './repository.types'

export enum EDaoMemberType {
  Dao = 'dao',
  User = 'user',
}

export enum EDaoInviteStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
  PROPOSAL_CREATED = 'proposal_created',
}

export type TDaoListItem = {
  account: Dao | null
  name: string
  address: string
  version: string
  supply: number
  members: number
  onboarding?: string[]
}

export type TUserDaoList = {
  isFetching: boolean
  error?: any
  items: TDaoListItem[]
  cursor?: string
  hasNext?: boolean
}

export type TDaoDetailsMemberItem = {
  usertype: EDaoMemberType
  profile: UserProfile | Dao
  wallet: DaoWallet
  allowance: number
  daomembers: { [address: string]: string }
  expert_tags: TDaoExpertTag[]
  vesting?: number
}

export type TDaoExpertTag = {
  name: string
  multiplier: number
}

export type TDaoDetails = {
  isFetching: boolean
  isFetchingData: boolean
  error?: any
  details: {
    account?: Dao
    _adapter?: IGoshDaoAdapter // TODO: Remove this after git part refactor
    name?: string
    address?: string
    version?: string
    repository?: GoshRepository
    summary?: string
    description?: string
    members?: TDaoDetailsMemberItem[]
    supply?: {
      reserve: number
      voting: number
      total: number
    }
    owner?: string
    tags?: string[]
    tasks?: number
    expert_tags?: TDaoExpertTag[]
    isMemberOf?: TDaoDetailsMemberItem[]
    isMintOn?: boolean
    isAskMembershipOn?: boolean
    isEventDiscussionOn?: boolean
    isEventProgressOn?: boolean
    isRepoUpgraded?: boolean
    isTaskUpgraded?: boolean
    isUpgraded?: boolean
    isReady?: boolean
  }
}

export type TDaoMember = {
  profile: UserProfile | null
  wallet: DaoWallet | null
  allowance: number | null
  balance: {
    voting: number
    locked: number
    regular: number
  } | null
  vesting: number | null
  isFetched: boolean
  isMember: boolean
  isLimited: boolean
  isReady: boolean
}

export type TDaoMemberListItem = TDaoDetailsMemberItem & {
  isFetching: boolean
  username: string
  balance: number
}

export type TDaoMemberList = {
  isFetching: boolean
  error?: any
  items: TDaoMemberListItem[]
}

export type TDaoEventReviewer = {
  username: string
  usertype: EDaoMemberType
  profile: string
}

export type TDaoEventDetails = {
  account: DaoEvent
  address: string
  updatedAt: number
  platformId: string
  type: number
  label: string
  status: {
    completed: boolean
    accepted: boolean
  }
  time: {
    start: number
    finish: number
    completed: number
  }
  votes: {
    yes: number
    no: number
    total: number
    yours: number
  }
  reviewers: TDaoEventReviewer[]
  data?: any
  isOpen?: boolean
}

export type TDaoEventList = {
  isFetching: boolean
  items: TDaoEventDetails[]
  cursor?: string
  hasNext?: boolean
  error?: any
}

export type TDaoInviteListItem = {
  id: string
  token: string
  username?: string
  email?: string
  status?: string
  allowance?: number
  comment?: string
  isFetching?: boolean
}

export type TDaoInviteList = {
  isFetching: boolean
  items: TDaoInviteListItem[]
  error?: any
}

export enum ETaskReward {
  ASSING = 1,
  REVIEW = 2,
  MANAGER = 3,
}

export type TTaskGrantPair = { grant: number; lock: number }

export type TTaskGrant = {
  assign: TTaskGrantPair[]
  review: TTaskGrantPair[]
  manager: TTaskGrantPair[]
  subtask: TTaskGrantPair[]
}

export type TTaskAssignerData = {
  taskaddr: string
  assigner: { [profile: string]: boolean }
  reviewer: { [profile: string]: boolean }
  manager: { [profile: string]: boolean }
  daomember: { [daoaddr: string]: string }
}

export type TTaskGrantTotal = {
  assign: number
  review: number
  manager: number
  subtask: number
}

export type TTaskTeamMember = {
  username: string
  usertype: EDaoMemberType
  profile: string
}

export type TTaskDetails = {
  account: Task | Milestone
  address: string
  name: string
  repository: {
    name: string
    address: string
  }
  grant: TTaskGrant
  grantTotal: TTaskGrantTotal
  reward: number
  balance: number
  vestingEnd: number
  tagsRaw: string[]
  tags: string[]
  candidates: any[]
  team: {
    assigners: TTaskTeamMember[]
    reviewers: TTaskTeamMember[]
    managers: TTaskTeamMember[]
    commit: TGoshCommit | null
  } | null
  locktime: number
  subtasks: TMilestoneTaskDetails[]
  isMilestone: boolean
  isSubtask: boolean
  isReady: boolean
  isOpen?: boolean
  isDeleted?: boolean
  isExpanded?: boolean
}

export type TMilestoneTaskDetails = TTaskDetails & {
  milestone: {
    address: string
    name: string
  }
  index: number
}

export type TDaoTaskList = {
  isFetching: boolean
  items: TTaskDetails[]
  cursor?: string
  hasNext?: boolean
  error?: any
}

export type TDBDaoInvite = {
  id: string
  daoname: string
  accepted: boolean | null
}
