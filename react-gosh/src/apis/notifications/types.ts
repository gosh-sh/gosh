import { KeyPair } from '@eversdk/core'

export type TSetNotificationRequest = {
    data: {
        username: string
        payload: { daoname: string; type: string; meta: object }
    }
    keys: KeyPair
}
