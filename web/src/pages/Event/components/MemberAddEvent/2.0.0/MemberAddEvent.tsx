import { GoshAdapterFactory, shortString, TAddress } from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../../components/CopyClipboard'

type TMemberAddEventProps = {
    data: any
}

const MemberAddEvent = (props: TMemberAddEventProps) => {
    const { data } = props
    const [members, setMembers] = useState<
        { username: string; profile: TAddress; allowance: number }[]
    >([])

    useEffect(() => {
        const _getProfileNames = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const items = await Promise.all(
                data.pubaddr.map(async (item: any) => {
                    const instance = await gosh.getProfile({ address: item.member })
                    return {
                        username: await instance.getName(),
                        profile: item.member,
                        allowance: item.count,
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
                    <div className="flex gap-3 text-gray-7c8db5 text-sm">
                        <div>Allowance:</div>
                        <div>{item.allowance}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default MemberAddEvent
