import { useCallback, useEffect } from 'react'
import { useUser } from './user.hooks'
import { useRecoilState } from 'recoil'
import {
  daoSettingsSelector,
  userNotificationListAtom,
  userSettingsAtom,
} from '../store/notification.state'
import { appToastStatusSelector } from '../../store/app.state'
import { GoshError } from '../../errors'
import { NotificationsAPI } from '../../apis/notifications'
import { TSetUserDaoSettingsRequest } from '../../apis/notifications/types'
import _ from 'lodash'
import { setLockableInterval } from '../../utils'

export function useUserNotificationSettings(options: { initialize?: boolean } = {}) {
  const { initialize } = options
  const { user } = useUser()
  const [userSettings, setUserSettings] = useRecoilState(userSettingsAtom)
  const [status, setStatus] = useRecoilState(
    appToastStatusSelector('__usernotificationsettings'),
  )

  const getUserSettings = useCallback(async () => {
    if (!user.username || !user.keys) {
      return
    }

    try {
      setUserSettings((state) => ({ ...state, isFetching: false }))
      let nt_user = await NotificationsAPI.settings.getUserSettings({
        username: user.username,
      })
      if (nt_user.error) {
        nt_user = await NotificationsAPI.settings.createUserSettings({
          data: {
            username: user.username,
            payload: { email_enabled: true, app_enabled: true },
          },
          keys: user.keys,
        })
      }
      setUserSettings((state) => ({
        ...state,
        data: {
          email: nt_user.data!.email,
          email_enabled: nt_user.data!.email_enabled,
          app_enabled: nt_user.data!.app_enabled,
        },
      }))
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
    } finally {
      setUserSettings((state) => ({ ...state, isFetching: false }))
    }
  }, [user.username])

  const updateUserSettings = useCallback(
    async (params: {
      email?: string
      email_enabled?: boolean
      app_enabled?: boolean
    }) => {
      try {
        if (!user.username) {
          throw new GoshError('Value error', 'Username undefined')
        }
        if (!user.keys) {
          throw new GoshError('Value error', 'User keys undefined')
        }

        const nt_user = await NotificationsAPI.settings.updateUserSettings({
          data: { username: user.username, payload: params },
          keys: user.keys,
        })
        setUserSettings((state) => ({
          ...state,
          data: { ...state.data, ...nt_user.data },
        }))
        setStatus((state) => ({
          ...state,
          type: 'success',
          data: {
            title: 'Settings updated',
            content: 'User notification settings updated',
          },
        }))
      } catch (e: any) {
        setStatus((state) => ({ ...state, type: 'error', data: e }))
        throw e
      }
    },
    [user.username],
  )

  useEffect(() => {
    if (initialize) {
      getUserSettings()
    }
  }, [initialize, getUserSettings])

  return {
    userSettings,
    updateUserSettings,
    status,
  }
}

export function useDaoNotificationSettings(
  options: { daoname?: string; initialize?: boolean } = {},
) {
  const { daoname, initialize } = options
  const { user } = useUser()
  const [daoSettings, setDaoSettings] = useRecoilState(daoSettingsSelector(daoname))
  const [status, setStatus] = useRecoilState(
    appToastStatusSelector('__daonotificationsettings'),
  )

  const getDaoSettings = useCallback(async () => {
    if (!user.username || !daoname) {
      return
    }

    try {
      setDaoSettings((state) => ({ ...state, isFetching: true }))
      const conn = await NotificationsAPI.settings.getUserDaoSettings({
        username: user.username,
        daoname,
      })
      if (!conn.error) {
        setDaoSettings((state) => ({
          ...state,
          data: { types: conn.data?.notification || state.data.types },
        }))
      }
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
    } finally {
      setDaoSettings((state) => ({ ...state, isFetching: false }))
    }
  }, [user.username, daoname])

  const updateDaoSettings = async (params: {
    daoname: string
    types: { [name: string]: boolean }
  }) => {
    const { types } = params
    const daoname = params.daoname.toLowerCase()

    try {
      if (!user.username) {
        throw new GoshError('Value error', 'Username undefined')
      }
      if (!user.keys) {
        throw new GoshError('Value error', 'User keys undefined')
      }

      setDaoSettings((state) => ({ ...state, isFetching: true }))
      const params: TSetUserDaoSettingsRequest = {
        data: {
          username: user.username,
          payload: { daoname, notification: types },
        },
        keys: user.keys,
      }
      let conn = await NotificationsAPI.settings.getUserDaoSettings({
        username: user.username,
        daoname,
      })
      if (conn.error) {
        conn = await NotificationsAPI.settings.createUserDaoSettings(params)
      } else {
        conn = await NotificationsAPI.settings.updateUserDaoSettings(params)
      }
      setDaoSettings((state) => ({
        ...state,
        data: {
          ...state.data,
          types: conn.data?.notification || state.data.types,
        },
      }))
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    } finally {
      setDaoSettings((state) => ({ ...state, isFetching: false }))
    }
  }

  useEffect(() => {
    if (initialize) {
      getDaoSettings()
    }
  }, [initialize, getDaoSettings])

  return {
    daoSettings,
    getDaoSettings,
    updateDaoSettings,
    status,
  }
}

export function useUserNotificationList(options: { initialize?: boolean } = {}) {
  const { initialize } = options
  const { user } = useUser()
  const [data, setData] = useRecoilState(userNotificationListAtom)

  const getUserNotifications = useCallback(async () => {
    if (!user.username) {
      return
    }

    try {
      setData((state) => ({ ...state, isFetching: true }))
      const items = await NotificationsAPI.notifications.getUserNotifications({
        username: user.username,
        options: { limit: 20 },
      })
      setData((state) => {
        const different = _.differenceWith(
          items.data,
          state.items,
          (a: any, b: any) => a.id === b.id,
        )
        const intersect = _.intersectionWith(
          items.data,
          state.items,
          (a: any, b: any) => a.id === b.id,
        )
        const updated = [...different, ...state.items].map((item) => {
          const found = intersect.find((_item) => _item.id === item.id)
          return found ? { ...item, ...found } : item
        })
        const unread = updated.filter((item: any) => !item.is_read).length

        const daolist = [...state.daolist]
        for (const item of updated) {
          const { notification } = item
          const found = daolist.find((a) => {
            return a.daoname === notification.daoname
          })
          if (!found) {
            daolist.push({ daoname: notification.daoname, selected: false })
          }
        }
        daolist.sort((a, b) => (a.daoname > b.daoname ? 1 : -1))

        return { ...state, unread, daolist, items: updated }
      })
    } catch (e) {
      console.error(e)
    } finally {
      setData((state) => ({ ...state, isFetching: false }))
    }
  }, [user.username])

  const updateUserNotification = async (id: number, values: any) => {
    try {
      if (!user.username) {
        throw new GoshError('Value error', 'Username undefined')
      }
      if (!user.keys) {
        throw new GoshError('Value error', 'User keys undefined')
      }

      await NotificationsAPI.notifications.updateAppNotificaton({
        data: { id, username: user.username, payload: values },
        keys: user.keys,
      })
      setData((state) => {
        const items = state.items.map((item) => {
          return item.id === id ? { ...item, ...values } : item
        })
        const unread = items.filter((item: any) => !item.is_read).length
        return { ...state, items, unread }
      })
    } catch (e) {
      console.error(e)
    }
  }

  const setFilters = (params: { daoname?: string }) => {
    const { daoname } = params
    setData((state) => ({
      ...state,
      daolist: state.daolist.map((item) => ({
        ...item,
        selected: item.daoname === daoname,
      })),
    }))
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (initialize) {
      getUserNotifications()
      interval = setLockableInterval(async () => await getUserNotifications(), 20000)
    }

    return () => {
      if (initialize) {
        clearInterval(interval)
      }
    }
  }, [initialize, getUserNotifications])

  return {
    data,
    setFilters,
    updateUserNotification,
  }
}
