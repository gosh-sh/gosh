import { TRepositoryCreateParams } from './repo.types'

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
    reviewers?: string[]
}

type TEventMultipleCreateProposalParams = TEventCreateParams & {
    proposals: {
        fn: 'CREATE_REPOSITORY'
        params: TRepositoryCreateParams
    }[]
}

export {
    TAddress,
    TEventMultipleCreateProposalParams,
    TPaginatedAccountsResult,
    TEventCreateParams,
    TValidationResult,
}
