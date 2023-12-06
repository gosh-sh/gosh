import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Hackathon } from '../blockchain/hackathon'

export enum EHackathonType {
    HACKATHON = 'hackathon',
    GRANT = 'grant',
}

export type THackathonParticipant = {
    dao_name: string
    repo_name: string
    description?: string
    is_member?: boolean
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
    storagedata: {
        is_fetching: boolean
        is_fetched: boolean
        description: { readme: string; rules: string; prizes: string }
        prize: { total: number; places: number[] }
    }
    participants: {
        is_fetching: boolean
        is_fetched: boolean
        items: THackathonParticipant[]
    }
    update_enabled?: boolean
    participate_enabled?: boolean
}

export type TDaoHackathonList = {
    is_fetching: boolean
    items: THackathonDetails[]
    cursor?: string
    has_next?: boolean
    error?: any
}
