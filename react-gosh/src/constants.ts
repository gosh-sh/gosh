export const ZERO_COMMIT = '0000000000000000000000000000000000000000'
export const MAX_ONCHAIN_SIZE = 64512
export const MAX_PARALLEL_READ = 20
export const MAX_PARALLEL_WRITE = 20

export const EventTypes: { [key: number]: string } = {
    1: 'Pull request',
    2: 'Add SMV branch protection',
    3: 'Remove SMV branch protection',
    5: 'Add DAO member(s)',
    6: 'Remove DAO member(s)',
}
