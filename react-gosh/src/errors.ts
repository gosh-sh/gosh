export enum EGoshError {
    PHRASE_INVALID = 'Seed phrase is invalid',

    PROFILE_NOT_EXIST = 'Profile does not exist... Signup, please',
    PROFILE_EXISTS = 'Profile already exists',
    PROFILE_INVALID_PUBKEY = 'Profile access denied with provided phrase/pubkey',
    PROFILE_UNDEFINED = 'Profile undefined',

    USER_KEYS_UNDEFINED = 'User keys undefined',
    NOT_MEMBER = 'Not a DAO member',
    META_LOAD = 'Error loading meta',

    GOSH_UNDEFINED = 'Gosh undefined',
    NO_WALLET = 'Wallet undefined',
    NO_REPO = 'Repository undefined',
    NO_BRANCH = 'Branch undefined',

    DAO_EXISTS = 'DAO already exists',
    DAO_UNDEFINED = 'DAO undefined',

    PR_BRANCH = 'Branch is resticted for direct commit. Make PR instead',
    PR_NO_MERGE = 'Nothing to merge',

    FILE_EXISTS = 'File already exists',
    FILE_EMPTY = 'File is empty',
    FILE_BINARY = 'File has binary data',
    FILE_UNMODIFIED = 'File content was not changed',

    SMV_LOCKER_BUSY = 'SMV locker busy',
    SMV_NO_PROPOSAL = 'SMV proposal undefined',
    SMV_NO_START = 'SMV voting for proposal is not started yet',
    SMV_NO_BALANCE = 'SMV not enough balance',
}

export class GoshError extends Error {
    title: string
    data?: object

    constructor(message: string, data?: object) {
        super(message + (data ? ` (${JSON.stringify(data)})` : ''))
        this.name = 'GoshError'
        this.title = message
        this.data = data
    }
}
