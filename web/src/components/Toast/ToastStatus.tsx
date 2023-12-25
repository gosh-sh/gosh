import { toast } from 'react-toastify'
import { ToastOptionsShortcuts } from '../../helpers'
import { TToastStatus } from '../../types/common.types'
import { ToastError } from './ToastError'
import { ToastSuccess } from './ToastSuccess'
import { useEffect, useRef } from 'react'
import { useRecoilState } from 'recoil'
import { appToastStatusAtom } from '../../store/app.state'

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
          autoClose: 5000,
        },
        update: {
          ...ToastOptionsShortcuts.Default,
          type: toast.TYPE.ERROR,
          autoClose: 5000,
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

type TToastStatusProps = {}

const ToastStatus = (props: TToastStatusProps) => {
  const [status, setStatus] = useRecoilState(appToastStatusAtom)
  const toastRef = useRef<any>({})

  useEffect(() => {
    toast.onChange((payload) => {
      if (payload.status === 'removed') {
        toastRef.current[payload.id] = null
        setStatus((state) => ({
          ...state,
          [payload.id]: { data: { type: null, data: null }, time: 0 },
        }))
      }
    })
  }, [])

  useEffect(() => {
    for (const key of Object.keys(status)) {
      const { data, time } = status[key]
      const refitem = toastRef.current[key]

      if (data.type === null) {
        continue
      } else if (data.type !== 'dismiss') {
        const { content, create, update } = getToastOptions(data)
        if (!refitem) {
          toastRef.current[key] = {
            ref: toast(content, { ...create, toastId: key }),
            time,
          }
        } else if (time > refitem.time) {
          toast.update(refitem.ref, update)
          toastRef.current[key].time = time
        }
      } else if (data.type === 'dismiss' && toastRef.current[key]) {
        toast.dismiss(refitem.ref)
      }
    }
  }, [status])

  return null
}

export { ToastStatus }
