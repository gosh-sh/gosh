import CopyClipboard from '../../../../../components/CopyClipboard'
import { shortString } from '../../../../../utils'

type TMemberUpdateEventProps = {
    data: {
        pubaddr: { username: string; profile: string; increase: boolean; grant: number }[]
    }
}

const MemberUpdateEvent = (props: TMemberUpdateEventProps) => {
    const { data } = props

    return (
        <div className="divide-y divide-gray-e6edff">
            {data.pubaddr.map((item, index) => (
                <div key={index} className="flex flex-col gap-2 py-3">
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Username
                        </div>
                        <div className="text-sm">{item.username}</div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Profile
                        </div>
                        <div className="text-sm">
                            <CopyClipboard
                                label={shortString(item.profile)}
                                componentProps={{ text: item.profile }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Karma
                        </div>
                        <div className="text-sm">
                            {item.increase ? '+' : '-'}
                            {item.grant.toLocaleString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export { MemberUpdateEvent }
