import { GoshAdapterFactory, shortString, TAddress, TSmvEvent } from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../components/CopyClipboard'

type TMemberAllowanceEventProps = {
    event: TSmvEvent
}

const MemberAllowanceEvent = (props: TMemberAllowanceEventProps) => {
    const { event } = props
    const { data } = event
    const [members, setMembers] = useState<
        { username: string; profile: TAddress; delta: number }[]
    >([])

    useEffect(() => {
        const _getEventState = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const usernames = await Promise.all(
                data.pubaddr.map(async (profile: string) => {
                    const instance = await gosh.getProfile({ address: profile })
                    return await instance.getName()
                }),
            )

            const prepared = data.pubaddr.map((profile: string, index: number) => {
                return {
                    username: usernames[index],
                    profile,
                    delta: data.increase[index]
                        ? `+${data.grant[index]}`
                        : `-${data.grant[index]}`,
                }
            })
            setMembers(prepared)
        }
        _getEventState()
    }, [data])

    return (
        <div className="divide-y divide-gray-e6edff">
            {members.map((item, index) => (
                <div key={index} className="py-2">
                    <div className="font-medium">{item.username}</div>
                    <div className="flex gap-3 text-gray-7c8db5 text-sm">
                        <div>Profile:</div>
                        <CopyClipboard
                            label={shortString(item.profile)}
                            componentProps={{ text: item.profile }}
                        />
                    </div>
                    <div className="flex gap-3 text-gray-7c8db5 text-sm">
                        <div>Allowance change:</div>
                        {item.delta}
                    </div>
                </div>
            ))}
        </div>
    )
}

export { MemberAllowanceEvent }
