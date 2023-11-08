import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { GoshRepository } from '../blockchain/repository'

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

export type THackathonDetails = {
    _rg_dao_details?: TDao // TODO: remove after git refactor
    _rg_repo_adapter?: IGoshRepositoryAdapter // TODO: remove after git refactor
    _rg_fetched?: boolean // TODO: remove after git refactor
    account: GoshRepository
    address: string
    name: string
    type: EHackathonType
    description: string
    tags_raw: string[]
    participants: {
        is_fetching: boolean
        items: THackathonParticipant[]
    }
    metadata: {
        is_fetching: boolean
        is_fetched: boolean
        title: string
        description: { readme: string; rules: string; prize: string }
        prize: { total: number; places: number[] }
        dates: { start: number; voting: number; finish: number }
        raw: string
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
