import { shortString, TAddress, TUserParam } from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../components/CopyClipboard'
import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'

type TMemberAllowanceEventProps = {
    data: any
    gosh: IGoshAdapter
}

const MemberAllowanceEvent = (props: TMemberAllowanceEventProps) => {
    const { data, gosh } = props
    const [members, setMembers] = useState<
        { user: TUserParam; profile: TAddress; delta: number }[]
    >([])

    useEffect(() => {
        const _getEventState = async () => {
            const users = await Promise.all(
                data.pubaddr.map(async (profile: string) => {
                    return await gosh.getUserByAddress(profile)
                }),
            )

            const prepared = data.pubaddr.map((profile: string, index: number) => {
                return {
                    user: users[index],
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
                        <div>Karma change:</div>
                        {item.delta}
                    </div>
                </div>
            ))}
        </div>
    )
}

export { MemberAllowanceEvent }
