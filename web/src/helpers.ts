import { createClient } from '@supabase/supabase-js'
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

export { supabase, getClipboardData, ToastOptionsShortcuts }
