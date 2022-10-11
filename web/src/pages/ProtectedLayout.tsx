import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import PinCodeModal from '../components/Modal/PinCode'
import { appModalStateAtom } from '../store/app.state'
import { useUser } from 'react-gosh'

type TProtectedLayoutProps = {
    redirect?: boolean
}

const ProtectedLayout = (props: TProtectedLayoutProps) => {
    const { redirect = true } = props

    const { user, persist } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)

    useEffect(() => {
        if (persist.pin && !user.phrase)
            setModal({
                static: true,
                isOpen: true,
                element: <PinCodeModal unlock={true} />,
            })
    }, [persist.pin, user.phrase, setModal])

    if (!persist.pin && redirect) return <Navigate to="/" />
    if (persist.username && !user.username) return null
    return <Outlet />
}

export default ProtectedLayout
