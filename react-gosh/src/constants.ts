export const ZERO_COMMIT = '0000000000000000000000000000000000000000'
export const ZERO_BLOB_SHA1 = 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
export const MAX_ONCHAIN_SIZE = 64512
export const MAX_PARALLEL_READ = 600
export const MAX_PARALLEL_WRITE = 200
export const SYSTEM_TAG = '___!system!___'
export const BIGTASK_TAG = '___!bigtask!___'

export const SmvEventTypes: { [key: number]: string } = {
    1: 'Pull request',
    2: 'Add branch protection',
    3: 'Remove branch protection',
    5: 'Add DAO member',
    6: 'Remove DAO member',
    7: 'Upgrade DAO',
    8: 'Change DAO config',
    9: 'Approve big task',
    10: 'Delete task',
    11: 'Create task',
    12: 'Create repository',
    13: 'Add voting tokens',
    14: 'Add regular tokens',
    15: 'Mint DAO tokens',
    16: 'Add DAO tag',
    17: 'Remove DAO tag',
    18: 'Disable minting DAO tokens',
    19: 'Change DAO member karma',
    20: 'Multi proposal',
    21: 'Add repository tag',
    22: 'Remove repository tag',
    23: 'Update repository description',
    24: 'Allow event discussions',
    25: 'Show event progress',
    26: 'Upgrade repository tags',
    27: 'Ask DAO membership allowance',
    28: 'DAO vote',
    29: 'Multi proposal as DAO',
    30: 'Delay',
    31: 'Dao token send',
    32: 'Upgrade version controller',
    33: 'DAO reviewer',
    34: 'DAO receive bounty',
    35: 'DAO token lock',
    36: 'Redeploy task',
    37: 'Redeployed task',
    38: 'Task upgrade',
    39: 'DAO transfer tokens from previous version',
    40: 'Start paid membership',
    41: 'Stop paid membership',
    42: 'Delete big task',
    43: 'Create big task',
    44: 'Upgrade big task',
}
