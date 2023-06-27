import { AppConfig } from './appconfig'
import { toast } from 'react-toastify'
import { createAvatar } from '@dicebear/core'
import { identicon } from '@dicebear/collection'

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

const getIdenticonAvatar = (options: any) => {
    return createAvatar(identicon, {
        radius: 8,
        scale: 60,
        backgroundColor: ['fafafd'],
        ...options,
    })
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
        isLoading: false,
        delay: 100,
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
    getClipboardData,
    onExternalLinkClick,
    ToastOptionsShortcuts,
    getIdenticonAvatar,
}
