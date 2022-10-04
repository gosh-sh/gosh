import { ResponseType } from '@eversdk/core/dist/bin'
import { useEffect, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { messageAtom } from '../store'
import { useProfile } from './user.hooks'

function useNotificationMessages() {
    const profile = useProfile()
    const setMessage = useSetRecoilState(messageAtom)
    const [subscriptions, setSubscriptions] = useState<any>({})

    useEffect(() => {
        const _updateSubscription = async () => {
            const key = 'profile'
            await _unsubscribe(key)
            if (profile?.address) await _subscribe(key, { dst: { eq: profile.address } })
        }

        _updateSubscription()
    }, [])

    const _subscribe = async (key: string, filter: object) => {
        const result = await AppConfig.goshclient.net.subscribe_collection(
            {
                collection: 'messages',
                filter,
                result: 'id msg_type body',
            },
            (params, responseType) => {
                if (responseType === ResponseType.Custom) {
                    setMessage({ key, message: params.result })
                } else console.warn(key, params, responseType)
            },
        )
        setSubscriptions((state: any) => ({ ...state, [key]: result.handle }))
    }

    const _unsubscribe = async (key: string) => {
        if (subscriptions[key]) {
            console.debug(`${key} unsubscribe`)
            await AppConfig.goshclient.net.unsubscribe({
                handle: subscriptions[key],
            })
        }
    }
}

export { useNotificationMessages }
