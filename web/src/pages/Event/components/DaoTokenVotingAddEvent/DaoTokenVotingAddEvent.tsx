import { useEffect, useState } from 'react'
import { GoshAdapterFactory } from 'react-gosh'

type TDaoTokenVotingAddEventProps = {
    data: any
}

const DaoTokenVotingAddEvent = (props: TDaoTokenVotingAddEventProps) => {
    const { data } = props
    const [username, setUsername] = useState<string>()

    useEffect(() => {
        const _getUsername = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const instance = await gosh.getProfile({ address: data.pubaddr })
            const name = await instance.getName()
            setUsername(name)
        }

        _getUsername()
    }, [data.pubaddr])

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Username:</div>
                <div>{username}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Amount:</div>
                <div>{data.grant}</div>
            </div>
        </div>
    )
}

export { DaoTokenVotingAddEvent }
