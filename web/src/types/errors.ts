export enum EGoshError {
    NO_USER = 'User undefined',
    NOT_PARTICIPANT = 'Not a DAO participant',
    META_LOAD = 'Error loading meta',

    NO_CREATOR_ADDR = 'Gosh creator address undefined',
    NO_ROOT = 'Gosh root undefined',
    NO_DAO = 'Gosh DAO undefined',
    NO_WALLET = 'Wallet undefined',
    NO_REPO = 'Repository undefined',
    NO_BRANCH = 'Branch undefined',

    DAO_EXISTS = 'DAO already exists',

    PR_BRANCH = 'Branch is resticted for direct commit. Make PR instead',
    PR_NO_MERGE = 'Nothing to merge',

    FILE_EXISTS = 'File already exists',
    FILE_EMPTY = 'File is empty',
    FILE_BINARY = 'File has binary data',
    FILE_UNMODIFIED = 'File content was not changed',

    SMV_LOCKER_BUSY = 'SMV locker busy',
    SMV_NO_PROPOSAL = 'SMV proposal undefined',
    SMV_NO_START = 'SMV voting for proposal is not started yet',
    SMV_NO_BALANCE = 'SMV not enough balance'
}

export class GoshError extends Error {
    title: string;
    data?: object;

    constructor(message: string, data?: object) {
        super(message + (data ? ` (${JSON.stringify(data)})` : ''));
        this.name = 'GoshError';
        this.title = message;
        this.data = data;
    }
}
