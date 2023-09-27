import { Provider } from '@supabase/supabase-js'
import { AppConfig } from './appconfig'
import { GoshError } from './errors'

export const supabase = {
    client: AppConfig.supabase,
    singinOAuth: async (provider: Provider, options?: { redirectTo?: string }) => {
        const scopes = 'read:user read:org'
        const { redirectTo } = options || {}

        if (AppConfig.dockerclient) {
            const nounce = Date.now()

            const { data, error } = await AppConfig.supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo:
                        redirectTo ||
                        `https://open.docker.com/dashboard/extension-tab?extensionId=teamgosh/docker-extension&nounce=${nounce}`,
                    scopes,
                    skipBrowserRedirect: true,
                },
            })
            if (error) {
                throw new GoshError(error.message)
            }

            console.log('data url', data.url)

            AppConfig.dockerclient.host.openExternal(data.url!)
        } else {
            const { error } = await AppConfig.supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectTo || document.location.href,
                    scopes,
                },
            })
            if (error) {
                throw new GoshError(error.message)
            }
        }
    },
    signoutOAuth: async () => {
        const { error } = await AppConfig.supabase.auth.signOut({ scope: 'local' })
        if (error) {
            throw new GoshError(error.message)
        }
    },
}
