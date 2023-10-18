import { KeyPair } from '@eversdk/core'
import { signData } from '../../helpers'

export const prepareRequestPayload = async (data: object, keys: KeyPair) => {
    const payload = {
        timestamp: Math.round(Date.now() / 1000),
        network: process.env.REACT_APP_NOTIFICATIONS_NET,
        data,
    }
    const { signed } = await signData(JSON.stringify(payload), keys)
    return signed
}

export const processResponse = async (response: Response, success: number[] = [200]) => {
    if (success.indexOf(response.status) < 0) {
        const error = await response.json()
        throw {
            name: 'HTTPError',
            message: error.message,
            data: {
                code: response.status,
                response: error,
            },
        }
    }

    const data = await response.json()
    return response.ok ? { data } : data
}
