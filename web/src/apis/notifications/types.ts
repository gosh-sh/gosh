import { KeyPair } from '@eversdk/core'

type TAPIRequestError = {
    error: {
        message: string
        data: object
    }
}

type TAPIUserSettings = {
    id: string
    created_at: string
    updated_at: string
    msg_created_at_last: number | null
    email: string
    username: string
    email_enabled: boolean
    app_enabled: boolean
    pubkey: string
}

export type TGetUserSettingsRequest = {
    username: string
}

export type TGetUserSettingsResponse = {
    data?: TAPIUserSettings
    error?: TAPIRequestError['error']
}

export type TSetUserSettingsRequest = {
    data: {
        username: string
        payload: { email?: string; email_enabled?: boolean; app_enabled?: boolean }
    }
    keys: KeyPair
}

type TAPIUserDaoSettings = {
    id: string
    created_at: string
    updated_at: string
    daoname: string
    notification: { [key: string]: boolean }
    username: string
}

export type TGetUserDaoSettingsRequest = {
    username: string
    daoname: string
}

export type TGetUserDaoSettingsResponse = {
    data?: TAPIUserDaoSettings
    error?: TAPIRequestError['error']
}

export type TSetUserDaoSettingsRequest = {
    data: {
        username: string
        payload: { daoname: string; notification: object }
    }
    keys: KeyPair
}

type TAPIAppNotificationDetails = {
    id: number
    created_at: string
    is_read: boolean
    conn: {
        id: string
    }
    notification: {
        type: string
        daoname: string
        meta: {
            label: string
            comment: string
        } & any
    }
}

type TAPIAppNotification = {
    id: number
    created_at: string
    userdao_conn_id: string
    notification_id: string
    is_read: boolean
}

export type TGetAppNotificationsRequest = {
    username: string
    options?: {
        daoname?: string
        limit?: number
    }
}

export type TGetAppNotificationsResponse = {
    data?: TAPIAppNotificationDetails[]
    error?: TAPIRequestError['error']
}

export type TSetNotificationRequest = {
    data: {
        username: string
        payload: { daoname: string; type: string; meta: object }
    }
    keys: KeyPair
}

export type TSetAppNotificationRequest = {
    data: {
        id: number | string
        username: string
        payload: { is_read: boolean }
    }
    keys: KeyPair
}

export type TSetAppNotificationResponse = {
    data?: TAPIAppNotification
    error?: TAPIRequestError['error']
}
