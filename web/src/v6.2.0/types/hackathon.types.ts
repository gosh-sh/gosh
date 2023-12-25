import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Hackathon } from '../blockchain/hackathon'

export enum EHackathonType {
  HACKATHON = 'hackathon',
  GRANT = 'grant',
}

export type THackathonParticipant = {
  dao_address: string
  dao_name: string
  repo_name: string
  description?: string
  is_member?: boolean
  is_selected?: boolean
  application?: THackathonApplication
}

export type THackathonApplication = {
  index: number
  dao_address: string
  dao_name: string
  repo_name: string
  votes: number
  members_karma_voted: { [profile: string]: number }
}

export type THackathonDates = { start: number; voting: number; finish: number }

export type THackathonDetails = {
  _rg_dao_details?: TDao // TODO: remove after git refactor
  _rg_repo_adapter?: IGoshRepositoryAdapter // TODO: remove after git refactor
  _rg_fetched?: boolean // TODO: remove after git refactor
  account: Hackathon
  address: string
  name: string
  type: EHackathonType
  prize_distribution: number[]
  prize_wallets: string[]
  expert_tags: string[]
  metadata: {
    branch_name: string
    dates: THackathonDates
    description: string
  }
  apps_approved: THackathonApplication[]
  members_karma_rest: { [profile: string]: number }
  storagedata: {
    is_fetching: boolean
    is_fetched: boolean
    description: { readme: string; rules: string; prizes: string }
    prize: { total: number; places: number[] }
    prize_raw: string
  }
  apps_submitted: {
    is_fetching: boolean
    is_fetched: boolean
    items: THackathonParticipant[]
  }
  is_voting_started?: boolean
  is_voting_created?: boolean
  is_voting_finished?: boolean
  is_update_enabled?: boolean
  is_participate_enabled?: boolean
  member_voting_state?: {
    karma_rest: number
    karma_rest_dirty: number
    karma_added: {
      dao_name: string
      repo_name: string
      value: number
      value_dirty: string
      index: number
    }[]
  }
}

export type TDaoHackathonList = {
  is_fetching: boolean
  items: THackathonDetails[]
  cursor?: string
  has_next?: boolean
  error?: any
}
