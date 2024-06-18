import { useEffect } from 'react'
import { useUser } from '../hooks/user.hooks'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { PinCodeModal } from '../components/Modal'
import { Navigate } from 'react-router-dom'

export const withPin = (Component: any, options: { redirect?: boolean }) => {
  return (props: any) => {
    const { redirect = false } = options
    const { user, persist } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)

    useEffect(() => {
      if (persist.pin && !user.phrase) {
        setModal({
          static: true,
          isOpen: true,
          element: <PinCodeModal unlock={true} />,
        })
      }
    }, [persist.pin, user.phrase, setModal])

    if (!persist.pin && redirect) {
      return <Navigate to="/" />
    }
    if (persist.username && !user.username) {
      return null
    }
    return <Component {...props} />
  }
}
