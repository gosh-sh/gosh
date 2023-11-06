import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { GoshRepository } from '../blockchain/repository'

export enum EHackatonType {
    HACKATON = 'hackaton',
    GRANT = 'grant',
}

export type THackatonParticipant = {
    dao_name: string
    repo_name: string
    description?: string
    is_member?: boolean
}

export type THackatonDetails = {
    _rg_dao_details?: TDao // TODO: remove after git refactor
    _rg_repo_adapter?: IGoshRepositoryAdapter // TODO: remove after git refactor
    account: GoshRepository
    address: string
    name: string
    type: EHackatonType
    description: string
    tags_raw: string[]
    participants: THackatonParticipant[]
    metadata: {
        is_fetching?: boolean
        title?: string
        description?: { readme: string; rules: string; prize: string }
        prize?: { total: number; places: number[] }
        dates?: { start: number; voting: number; finish: number }
        raw?: string
    }
}

export type TDaoHackatonList = {
    is_fetching: boolean
    items: THackatonDetails[]
    cursor?: string
    has_next?: boolean
    error?: any
}
