export enum EGoshError {
  PHRASE_INVALID = 'Seed phrase is invalid',

  GOSH_UNDEFINED = 'Gosh undefined',

  PROFILE_NOT_EXIST = 'Profile does not exist',
  PROFILE_EXISTS = 'Profile already exists',
  PROFILE_PUBKEY_INVALID = 'Profile access denied with provided phrase/pubkey',
  PROFILE_UNDEFINED = 'Profile undefined',
  PROFILE_NO_SIGNER = 'Profile has no signer keys defined',

  USER_KEYS_UNDEFINED = 'User keys undefined',
  USER_NAME_UNDEFINED = 'User name undefined',
  USER_NAME_INVALID = 'Incorrect username',

  WALLET_UNDEFINED = 'Wallet undefined',
  WALLET_NO_SIGNER = 'Wallet has no signer keys defined',

  NOT_MEMBER = 'Not a DAO member',
  META_LOAD = 'Error loading meta',

  REPO_NAME_INVALID = 'Incorrect repository name',
  NO_WALLET = 'Wallet undefined',
  NO_REPO = 'Repository undefined',
  NO_BRANCH = 'Branch undefined',

  DAO_NAME_INVALID = 'Incorrect DAO name',
  DAO_EXISTS = 'DAO already exists',
  DAO_UNDEFINED = 'DAO undefined',

  PR_BRANCH = 'Branch is protected. Please, make a proposal',
  PR_NO_MERGE = 'Nothing to merge',

  FILE_EXISTS = 'File already exists',
  FILE_NOT_EXIST = 'File doest not exist',
  FILE_EMPTY = 'File is empty',
  FILE_BINARY = 'File has binary data',
  FILE_UNMODIFIED = 'File content was not changed',

  SMV_LOCKER_BUSY = 'SMV locker busy',
  SMV_NO_PROPOSAL = 'SMV proposal undefined',
  SMV_NO_START = 'Voting for event is not started yet',
  SMV_NO_BALANCE = 'Not enough tokens to start proposal',
  SMV_NO_ALLOWANCE = 'Not enough karma to start proposal',
}

export class GoshError extends Error {
  title: string
  data?: object | string

  constructor(message: string, data?: object | string) {
    super(message + (data ? ` (${JSON.stringify(data)})` : ''))
    this.name = 'GoshError'
    this.title = message
    this.data = data
  }
}
