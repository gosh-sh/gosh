import { useEffect, useState } from 'react'
import { TUserParam } from 'react-gosh'
import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'

type TDaoTokenRegularAddEventProps = {
    data: any
    gosh: IGoshAdapter
}

const DaoTokenRegularAddEvent = (props: TDaoTokenRegularAddEventProps) => {
    const { data, gosh } = props
    const [user, setUser] = useState<TUserParam>()

    useEffect(() => {
        const _getUser = async () => {
            const user = await gosh.getUserByAddress(data.pubaddr)
            setUser(user)
        }

        _getUser()
    }, [data.pubaddr])

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Username:</div>
                <div>
                    {user?.name} ({user?.type})
                </div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Amount:</div>
                <div>{data.grant}</div>
            </div>
        </div>
    )
}

export { DaoTokenRegularAddEvent }
