import { shortString, TAddress, TUserParam } from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../components/CopyClipboard'
import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'

type TMemberRemoveEventProps = {
    data: any
    gosh: IGoshAdapter
}

const MemberRemoveEvent = (props: TMemberRemoveEventProps) => {
    const { data, gosh } = props
    const [members, setMembers] = useState<{ user: TUserParam; profile: TAddress }[]>([])

    useEffect(() => {
        const _getProfileNames = async () => {
            const items = await Promise.all(
                data.pubaddr.map(async (profile: string) => {
                    const user = await gosh.getUserByAddress(profile)
                    return { user, profile }
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
                </div>
            ))}
        </div>
    )
}

export { MemberRemoveEvent }
