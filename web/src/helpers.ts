import { createClient, Provider } from '@supabase/supabase-js'
import { AppConfig } from 'react-gosh'
import { GoshError } from 'react-gosh'
import { toast } from 'react-toastify'

const supabase = createClient(
    'https://auth.gosh.sh',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaHNrdnN6dGVwYnlpc2Jxc2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzA0MTMwNTEsImV4cCI6MTk4NTk4OTA1MX0._6KcFBYmSUfJqTJsKkWcMoIQBv3tuInic9hvEHuFpJg',
)

const getClipboardData = async (event?: any): Promise<string | null> => {
    if (event?.clipboardData && event.clipboardData.getData) {
        return event.clipboardData.getData('text/plain')
    }

    const win = window as any
    if (win.clipboardData && win.clipboardData.getData) {
        return win.clipboardData.getData('Text')
    }

    if (navigator.clipboard.readText !== undefined) {
        return await navigator.clipboard.readText()
    }

    return null
}

const onExternalLinkClick = (e: any, url: string) => {
    if (!AppConfig.dockerclient) {
        return
    }
    e.preventDefault()
    AppConfig.dockerclient.host.openExternal(url)
}

const singinOAuthSupabase = async (provider: Provider) => {
    const scopes = 'read:user read:org'

    if (AppConfig.dockerclient) {
        const nounce = Date.now()

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `https://open.docker.com/dashboard/extension-tab?extensionId=teamgosh/docker-extension&nounce=${nounce}`,
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
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: document.location.href,
                scopes,
            },
        })
        if (error) {
            throw new GoshError(error.message)
        }
    }
}

const signoutOAuthSupabase = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
        throw new GoshError(error.message)
    }
}

/**
 * Toast shortcuts
 */
const ToastOptionsShortcuts = {
    Default: {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        pauseOnFocusLoss: false,
        draggable: true,
        closeButton: true,
        progress: undefined,
    },
    Message: {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 1500,
        pauseOnFocusLoss: false,
        pauseOnHover: false,
        closeButton: false,
        hideProgressBar: true,
    },
    CopyMessage: {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 1500,
        pauseOnFocusLoss: false,
        pauseOnHover: false,
        closeButton: false,
        hideProgressBar: true,
        style: { width: '50%' },
        className: 'mx-auto',
    },
}

export {
    supabase,
    singinOAuthSupabase,
    signoutOAuthSupabase,
    getClipboardData,
    onExternalLinkClick,
    ToastOptionsShortcuts,
}
