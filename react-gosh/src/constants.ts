export const ZERO_COMMIT = '0000000000000000000000000000000000000000'
export const ZERO_BLOB_SHA1 = 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
export const MAX_ONCHAIN_SIZE = 64512
export const MAX_PARALLEL_READ = 600
export const MAX_PARALLEL_WRITE = 200

export const SmvEventTypes: { [key: number]: string } = {
    1: 'Pull request',
    2: 'Add SMV branch protection',
    3: 'Remove SMV branch protection',
    5: 'Add DAO member(s)',
    6: 'Remove DAO member(s)',
    7: 'Upgrade DAO',
    8: 'Change DAO config',
    9: 'Confirm task',
    10: 'Delete task',
    11: 'Create task',
    12: 'Create repository',
    13: 'SMV token add',
    14: 'Token add',
    15: 'Token mint',
    16: 'Add DAO tag',
    17: 'Remove DAO tag',
    18: 'Disable minting DAO tokens',
    19: 'Change DAO member(s) allowance',
    20: 'Multi proposal',
    21: 'Add repository tag',
    22: 'Remove repository tag',
    23: 'Update repository description',
}
