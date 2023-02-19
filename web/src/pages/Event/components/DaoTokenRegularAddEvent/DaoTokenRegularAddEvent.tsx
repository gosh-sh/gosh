import { useEffect, useState } from 'react'
import { GoshAdapterFactory, TSmvEvent } from 'react-gosh'

type TDaoTokenRegularAddEventProps = {
    event: TSmvEvent
}

const DaoTokenRegularAddEvent = (props: TDaoTokenRegularAddEventProps) => {
    const { event } = props
    const [username, setUsername] = useState<string>()

    useEffect(() => {
        const _getUsername = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const instance = await gosh.getProfile({ address: event.data.pubaddr })
            const name = await instance.getName()
            setUsername(name)
        }

        _getUsername()
    }, [event.data.pubaddr])

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Username:</div>
                <div>{username}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Amount:</div>
                <div>{event.data.grant}</div>
            </div>
        </div>
    )
}

export { DaoTokenRegularAddEvent }
