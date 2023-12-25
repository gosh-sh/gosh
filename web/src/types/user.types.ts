import { KeyPair } from '@eversdk/core'

export type TUserPersist = {
  username?: string
  profile?: string
  phrase?: string
  nonce?: string
  pin?: string
}

export type TUser = TUserPersist & {
  keys?: KeyPair
}
