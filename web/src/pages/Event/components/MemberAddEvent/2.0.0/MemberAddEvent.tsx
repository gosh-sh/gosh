import { shortString, TAddress, TUserParam } from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../../components/CopyClipboard'
import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'

type TMemberAddEventProps = {
    data: any
    gosh: IGoshAdapter
}

const MemberAddEvent = (props: TMemberAddEventProps) => {
    const { data, gosh } = props
    const [members, setMembers] = useState<
        { user: TUserParam; profile: TAddress; allowance: number }[]
    >([])

    useEffect(() => {
        const _getProfileNames = async () => {
            const items = await Promise.all(
                data.pubaddr.map(async (item: any) => {
                    const user = await gosh.getUserByAddress(item.member)
                    return {
                        user,
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
                    <div className="font-medium">
                        {item.user.name} ({item.user.type})
                    </div>
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
