import { prepareRequestPayload, processResponse } from './helpers'
import {
  TGetUserDaoSettingsRequest,
  TGetAppNotificationsRequest,
  TGetUserSettingsRequest,
  TSetNotificationRequest,
  TSetUserDaoSettingsRequest,
  TSetUserSettingsRequest,
  TSetAppNotificationRequest,
  TGetUserSettingsResponse,
  TGetUserDaoSettingsResponse,
  TGetAppNotificationsResponse,
  TSetAppNotificationResponse,
} from './types'

const API_URL = import.meta.env.REACT_APP_NOTIFICATIONS_API

export const NotificationsAPI = {
  settings: {
    getUserSettings: async (
      params: TGetUserSettingsRequest,
    ): Promise<TGetUserSettingsResponse> => {
      const { username } = params
      const response = await fetch(`${API_URL}/settings/users/${username}`)
      return await processResponse(response, [200, 404])
    },
    createUserSettings: async (
      params: TSetUserSettingsRequest,
    ): Promise<TGetUserSettingsResponse> => {
      const { data, keys } = params
      const response = await fetch(`${API_URL}/settings/users`, {
        method: 'POST',
        body: JSON.stringify({
          username: data.username,
          payload: await prepareRequestPayload(data.payload, keys),
        }),
      })
      return await processResponse(response)
    },
    updateUserSettings: async (
      params: TSetUserSettingsRequest,
    ): Promise<TGetUserSettingsResponse> => {
      const { data, keys } = params
      const response = await fetch(`${API_URL}/settings/users`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: data.username,
          payload: await prepareRequestPayload(data.payload, keys),
        }),
      })
      return await processResponse(response)
    },
    getUserDaoSettings: async (
      params: TGetUserDaoSettingsRequest,
    ): Promise<TGetUserDaoSettingsResponse> => {
      const { username, daoname } = params
      const response = await fetch(`${API_URL}/settings/users/${username}/dao/${daoname}`)
      return await processResponse(response, [200, 404])
    },
    createUserDaoSettings: async (
      params: TSetUserDaoSettingsRequest,
    ): Promise<TGetUserDaoSettingsResponse> => {
      const { data, keys } = params
      const response = await fetch(`${API_URL}/settings/users/dao`, {
        method: 'POST',
        body: JSON.stringify({
          username: data.username,
          payload: await prepareRequestPayload(data.payload, keys),
        }),
      })
      return await processResponse(response)
    },
    updateUserDaoSettings: async (
      params: TSetUserDaoSettingsRequest,
    ): Promise<TGetUserDaoSettingsResponse> => {
      const { data, keys } = params
      const response = await fetch(`${API_URL}/settings/users/dao`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: data.username,
          payload: await prepareRequestPayload(data.payload, keys),
        }),
      })
      return await processResponse(response)
    },
  },
  notifications: {
    getUserNotifications: async (
      params: TGetAppNotificationsRequest,
    ): Promise<TGetAppNotificationsResponse> => {
      const { username, options } = params

      const search = new URLSearchParams()
      if (options?.daoname) {
        search.set('daoname', options.daoname)
      }
      if (options?.limit) {
        search.set('limit', options.limit.toString())
      }

      const response = await fetch(
        `${API_URL}/notifications/${username}?${search.toString()}`,
      )
      return await processResponse(response)
    },
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
    updateAppNotificaton: async (
      params: TSetAppNotificationRequest,
    ): Promise<TSetAppNotificationResponse> => {
      const { data, keys } = params
      const response = await fetch(`${API_URL}/notifications/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: data.username,
          payload: await prepareRequestPayload(data.payload, keys),
        }),
      })
      return await processResponse(response)
    },
  },
}
