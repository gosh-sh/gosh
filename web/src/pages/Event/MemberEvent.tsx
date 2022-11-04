import { Link } from 'react-router-dom'
import {
    EEventType,
    GoshAdapterFactory,
    shortString,
    TAddress,
    TGoshEventDetails,
} from 'react-gosh'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../components/CopyClipboard'

type TMemberEventProps = {
    daoName?: string
    details: TGoshEventDetails
}

const MemberEvent = (props: TMemberEventProps) => {
    const { daoName, details } = props
    const { params, status } = details
    const [members, setMembers] = useState<{ username: string; profile: TAddress }[]>([])

    useEffect(() => {
        const _getProfileNames = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const items = await Promise.all(
                params.pubaddr.map(async (profile: string) => {
                    const instance = await gosh.getProfile({ address: profile })
                    return { username: await instance.getName(), profile }
                }),
            )
            setMembers(items)
        }

        _getProfileNames()
    }, [params.pubaddr])

    return (
        <div>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    <p>Add DAO member(s) proposal was accepted by SMV</p>
                    <p>
                        Check
                        <Link
                            className="mx-1 underline"
                            to={`/o/${daoName}/settings/members`}
                        >
                            members list
                        </Link>
                    </p>
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">Event details</h4>
            <div>
                {params.proposalKind === EEventType.DAO_MEMBER_ADD && 'Add'}
                {params.proposalKind === EEventType.DAO_MEMBER_DELETE && 'Remove'}

                <span className="mx-1">DAO member(s)</span>
                <div className="divide-y divide-gray-c4c4c4">
                    {members.map((item, index) => (
                        <div key={index} className="py-2">
                            <div className="font-semibold">{item.username}</div>
                            <CopyClipboard
                                className="text-sm text-gray-606060"
                                label={shortString(item.profile)}
                                componentProps={{ text: item.profile }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default MemberEvent
