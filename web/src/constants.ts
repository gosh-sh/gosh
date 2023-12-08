import { ENotificationType } from './types/notification.types'

export const ZERO_COMMIT = '0000000000000000000000000000000000000000'
export const ZERO_BLOB_SHA1 = 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
export const MAX_ONCHAIN_SIZE = 64512
export const MAX_PARALLEL_READ = 600
export const MAX_PARALLEL_WRITE = 200
export const SYSTEM_TAG = '___!system!___'
export const DAO_TOKEN_TRANSFER_TAG = '___!daotokentransfer!___'
export const VESTING_BALANCE_TAG = '___!vestingbalance!___'
export const MILESTONE_TAG = '___!milestone!___'
export const MILESTONE_TASK_TAG = '___!milestonetask!___'
export const HACKATHON_TAG = {
    hackathon: '___!hackathon:hack!___',
    grant: '___!hackathon:grant!___',
    participant: '___!hackathon:participant!___',
}
export const HACKATHONS_REPO = '_hackathons'
export const DISABLED_VERSIONS = ['5.0.0', '6.0.0']
export const L2_COMISSION = 1000 // 0.1% 0.001
export const PERSIST_REDIRECT_KEY = 'gosh-redirect'

export const PARTNER_DAO_NAMES: string[] = JSON.parse(
    import.meta.env.REACT_APP_DAO_PARTNER || '[]',
)

export const DaoEventType: { [key: number]: string } = {
    1: 'Pull request',
    2: 'Add branch protection',
    3: 'Remove branch protection',
    5: 'Add DAO member',
    6: 'Remove DAO member',
    7: 'Upgrade DAO',
    8: 'Change DAO config',
    9: 'Complete milestone',
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
    38: 'Upgrade task',
    39: 'DAO transfer tokens from previous version',
    42: 'Delete milestone',
    43: 'Create milestone',
    44: 'Upgrade milestone',
    46: 'Delete repository',
    47: 'Update DAO expert tag',
    48: 'Delete DAO expert tag',
    49: 'Add expert tag for DAO member',
    50: 'Delete expert tag for DAO member',
    51: 'Create hackathon',
    53: 'Create hackathon voting',
    54: 'Update hackathon',
    56: 'Create repository branch',
}

export const NotificationType: { [key: string]: string } = {
    [ENotificationType.DAO_EVENT_CREATED]: 'New proposal',
    [ENotificationType.REPO_COMMIT_PUSHED]: 'New commit',
}

export const L2Web3Chains: { [key: string]: { name: string; iconpath: string } } = {
    '': {
        name: '',
        iconpath: '/images/tokens/ethereum.webp',
    },
    '0x1': {
        name: 'Ethereum',
        iconpath: '/images/tokens/ethereum.webp',
    },
    '0xaa36a7': {
        name: 'Ethereum (Sepolia)',
        iconpath: '/images/tokens/ethereum.webp',
    },
}
