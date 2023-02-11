import { TCreateRepositoryParams } from './repo.types'

type TAddress = string

type TCreateMultiProposalParams = {
    fn: 'CREATE_REPOSITORY'
    params: TCreateRepositoryParams
}[]

type TPaginatedAccountsResult = {
    results: any[]
    lastPaid?: number
    completed: boolean
}

type TValidationResult = {
    valid: boolean
    reason?: string
}

export {
    TAddress,
    TCreateMultiProposalParams,
    TPaginatedAccountsResult,
    TValidationResult,
}
