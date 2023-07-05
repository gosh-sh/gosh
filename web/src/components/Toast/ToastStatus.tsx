import { toast } from 'react-toastify'
import { ToastOptionsShortcuts } from '../../helpers'
import { TToastStatus } from '../../types/common.types'
import { ToastError } from './ToastError'
import { ToastSuccess } from './ToastSuccess'
import { useEffect, useRef } from 'react'

const getToastOptions = (status: TToastStatus) => {
    const { type, data } = status

    switch (type) {
        case 'pending':
            return {
                content: data,
                create: {
                    isLoading: true,
                    closeButton: false,
                    closeOnClick: false,
                    draggable: false,
                },
                update: {
                    isLoading: true,
                    closeButton: false,
                    closeOnClick: false,
                    draggable: false,
                    render: () => data,
                },
            }
        case 'error':
            return {
                content: <ToastError error={data} />,
                create: {
                    ...ToastOptionsShortcuts.Default,
                    type: toast.TYPE.ERROR,
                },
                update: {
                    ...ToastOptionsShortcuts.Default,
                    type: toast.TYPE.ERROR,
                    render: () => <ToastError error={data} />,
                },
            }
        case 'success':
            return {
                content: <ToastSuccess message={data} />,
                create: {
                    ...ToastOptionsShortcuts.Default,
                    type: toast.TYPE.SUCCESS,
                },
                update: {
                    ...ToastOptionsShortcuts.Default,
                    type: toast.TYPE.SUCCESS,
                    render: () => <ToastSuccess message={data} />,
                },
            }
        default:
            return {
                content: '',
                create: {},
                update: {},
            }
    }
}

type TToastStatusProps = {
    status?: TToastStatus
}

const ToastStatus = (props: TToastStatusProps) => {
    const { status } = props
    const toastRef = useRef<any>(null)

    useEffect(() => {
        toast.onChange((payload) => {
            if (payload.status === 'removed') {
                toastRef.current = null
            }
        })
    }, [])

    useEffect(() => {
        if (status) {
            const { content, create, update } = getToastOptions(status)
            if (!toastRef.current) {
                toastRef.current = toast(content, create)
            } else {
                toast.update(toastRef.current, update)
            }
        } else {
            toast.dismiss(toastRef.current)
        }
    }, [status])

    return null
}

export { ToastStatus }
