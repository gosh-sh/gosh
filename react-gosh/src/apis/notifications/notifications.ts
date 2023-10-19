import { AppConfig } from '../../appconfig'
import { prepareRequestPayload, processResponse } from './helpers'
import { TSetNotificationRequest } from './types'

export const NotificationsAPI = {
    notifications: {
        createNotificaton: async (params: TSetNotificationRequest) => {
            const { data, keys } = params
            const response = await fetch(`${AppConfig.ntApiUrl}/notifications`, {
                method: 'POST',
                body: JSON.stringify({
                    username: data.username,
                    payload: await prepareRequestPayload(data.payload, keys),
                }),
            })
            return await processResponse(response)
        },
    },
}
