import { GoshAdapterFactory, shortString, TAddress, TSmvEvent } from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../components/CopyClipboard'

type TMemberRemoveEventProps = {
    event: TSmvEvent
}

const MemberRemoveEvent = (props: TMemberRemoveEventProps) => {
    const { event } = props
    const { data } = event
    const [members, setMembers] = useState<{ username: string; profile: TAddress }[]>([])

    useEffect(() => {
        const _getProfileNames = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const items = await Promise.all(
                data.pubaddr.map(async (profile: string) => {
                    const instance = await gosh.getProfile({ address: profile })
                    return {
                        username: await instance.getName(),
                        profile,
                    }
                }),
            )
            setMembers(items)
        }
        _getProfileNames()
    }, [data.pubaddr])

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
                </div>
            ))}
        </div>
    )
}

export { MemberRemoveEvent }
