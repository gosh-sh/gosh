import { prepareRequestPayload, processResponse } from './helpers'
import { TSetNotificationRequest } from './types'

const API_URL = process.env.REACT_APP_NOTIFICATIONS_API

export const NotificationsAPI = {
    notifications: {
        createNotificaton: async (params: TSetNotificationRequest) => {
            const { data, keys } = params
            const response = await fetch(`${API_URL}/notifications`, {
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
