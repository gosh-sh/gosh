import { useCallback, useEffect } from 'react'
import { useUser } from './user.hooks'
import { useRecoilState } from 'recoil'
import { daoSettingsSelector, userSettingsAtom } from '../store/notification.state'
import { appToastStatusSelector } from '../../store/app.state'
import { supabase } from '../../supabase'
import { GoshError } from '../../errors'

export function useUserNotificationSettings(options: { initialize?: boolean } = {}) {
    const { initialize } = options
    const { user } = useUser()
    const [userSettings, setUserSettings] = useRecoilState(userSettingsAtom)
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__usernotificationsettings'),
    )

    const getDbUser = async (username: string) => {
        const { data, error } = await supabase.client
            .from('users')
            .select()
            .eq('gosh_username', username.toLowerCase())
            .order('created_at', { ascending: false })
        if (error) {
            throw new Error(error.message)
        }
        return data.length > 0 ? data[0] : null
    }

    const getServiceUser = async (username: string) => {
        const { data, error } = await supabase.client
            .from('nt_user')
            .select()
            .eq('username', username.toLowerCase())
            .maybeSingle()
        if (error) {
            throw new Error(error.message)
        }
        return data
    }

    const createServiceUser = async (values: object) => {
        const { data, error } = await supabase.client
            .from('nt_user')
            .insert(values)
            .select()
            .single()
        if (error) {
            throw new Error(error.message)
        }
        return data
    }

    const getUserSettings = useCallback(async () => {
        if (!user.username) {
            return
        }

        try {
            setUserSettings((state) => ({ ...state, isFetching: false }))
            let nt_user = await getServiceUser(user.username)
            if (!nt_user) {
                const db_user = await getDbUser(user.username)
                nt_user = await createServiceUser({
                    username: user.username,
                    email: db_user?.email,
                })
            }
            setUserSettings((state) => ({
                ...state,
                data: {
                    email: nt_user.email,
                    email_enabled: nt_user.email_enabled,
                },
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
        } finally {
            setUserSettings((state) => ({ ...state, isFetching: false }))
        }
    }, [user.username])

    const updateUserSettings = useCallback(
        async (params: { email?: string; email_enabled?: boolean }) => {
            try {
                if (!user.username) {
                    throw new GoshError('Value error', 'Username undefined')
                }

                // Update service user
                const { data, error } = await supabase.client
                    .from('nt_user')
                    .update({ ...params, updated_at: new Date().toISOString() })
                    .eq('username', user.username)
                    .select('email, email_enabled')
                    .single()
                if (error) {
                    throw new GoshError('Update error', error.message)
                }

                // Update state
                setUserSettings((state) => ({
                    ...state,
                    data: { ...state.data, ...data },
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

    const getUserDaoConn = async (username: string, daoname: string) => {
        const { data, error } = await supabase.client
            .from('nt_userdao_conn')
            .select()
            .eq('username', username.toLowerCase())
            .eq('daoname', daoname.toLowerCase())
            .maybeSingle()
        if (error) {
            throw new Error(error.message)
        }
        return data
    }

    const createUserDaoConn = async (values: object) => {
        const { data, error } = await supabase.client
            .from('nt_userdao_conn')
            .insert(values)
            .select()
            .single()
        if (error) {
            throw new Error(error.message)
        }
        return data
    }

    const getDaoSettings = useCallback(async () => {
        if (!user.username || !daoname) {
            return
        }

        try {
            setDaoSettings((state) => ({ ...state, isFetching: true }))
            const conn = await getUserDaoConn(user.username, daoname)
            setDaoSettings((state) => ({
                ...state,
                data: {
                    types: conn ? conn.notification : {},
                },
            }))
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

            setDaoSettings((state) => ({ ...state, isFetching: true }))

            // Get or create userdao conn and update notification types
            let conn = await getUserDaoConn(user.username, daoname)
            if (!conn) {
                conn = await createUserDaoConn({
                    username: user.username,
                    daoname,
                    notification: types,
                })
            } else {
                const { data, error } = await supabase.client
                    .from('nt_userdao_conn')
                    .update({
                        updated_at: new Date().toISOString(),
                        notification: { ...conn.notification, ...types },
                    })
                    .eq('username', user.username)
                    .eq('daoname', daoname)
                    .select()
                    .single()
                if (error) {
                    throw new GoshError('Update error', error.message)
                }
                conn = data
            }

            // Update state
            setDaoSettings((state) => ({
                ...state,
                data: {
                    ...state.data,
                    types: conn.notification,
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
