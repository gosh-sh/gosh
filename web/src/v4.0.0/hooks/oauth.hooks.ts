import { useLocation } from 'react-router-dom'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { OAuthSessionAtom } from '../store/oauth.state'
import { Provider } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import { useEffect } from 'react'

export function useOauth() {
  const location = useLocation()
  const [oauth, setOAuth] = useRecoilState(OAuthSessionAtom)
  const resetOAuth = useResetRecoilState(OAuthSessionAtom)

  const signin = async (provider: Provider) => {
    await supabase.singinOAuth(provider)
  }

  const signout = async () => {
    await supabase.signoutOAuth()
    resetOAuth()
  }

  useEffect(() => {
    const _getOAuthSession = async () => {
      setOAuth({ session: null, isLoading: true })
      const { data } = await supabase.client.auth.getSession()
      setOAuth({ session: data.session, isLoading: false })
    }

    _getOAuthSession()
  }, [setOAuth])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('error')) {
      setOAuth((state) => ({
        ...state,
        error: {
          title: params.get('error'),
          message: params.get('error_description'),
        },
      }))
    }
  }, [location.search])

  return {
    oauth,
    signin,
    signout,
  }
}
