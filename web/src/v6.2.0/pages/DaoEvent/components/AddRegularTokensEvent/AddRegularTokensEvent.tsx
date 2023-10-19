import CopyClipboard from '../../../../../components/CopyClipboard'
import { shortString } from '../../../../../utils'

type TAddRegularTokensEventProps = {
    data: { pubaddr: { username: string; profile: string }; grant: number }
}

const AddRegularTokensEvent = (props: TAddRegularTokensEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Username
                </div>
                <div className="text-sm">{data.pubaddr.username}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Profile
                </div>
                <div className="text-sm">
                    <CopyClipboard
                        label={shortString(data.pubaddr.profile)}
                        componentProps={{ text: data.pubaddr.profile }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Amount
                </div>
                <div className="text-sm">{data.grant.toLocaleString()}</div>
            </div>
        </div>
    )
}

export { AddRegularTokensEvent }
