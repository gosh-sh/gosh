export type TUserNotificationSettings = {
    isFetching: boolean
    data: {
        email: string | null
        email_enabled: boolean | null
    }
}

export type TDaoNotificationSettings = {
    isFetching: boolean
    data: {
        types: { [name: string]: boolean }
    }
}

export type TUserNotificationList = {
    isFetching: boolean
    unread: number
    daolist: { daoname: string; selected: boolean }[]
    items: any[]
}
