import moment from 'moment'
import { BadgeExpertTag } from '../../../../components/Badge'

type THackathonUpdateEventProps = {
    data: any
}

const dt_format = 'MMM D, YYYY HH:mm:ss'

const HackathonUpdateEvent = (props: THackathonUpdateEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Hackathon name
                </div>
                <div className="text-sm">{data.name}</div>
            </div>
            {data.metadata.description.brief && (
                <div className="flex flex-wrap items-center gap-x-6">
                    <div className="basis-full text-xs text-gray-53596d">
                        Short description
                    </div>

                    <div className="text-sm">{data.metadata.description.brief}</div>
                </div>
            )}
            {data.metadata.dates && (
                <>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Start date
                        </div>
                        <div className="text-sm">
                            {moment.unix(data.metadata.dates.start).format(dt_format)}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Voting date
                        </div>
                        <div className="text-sm">
                            {moment.unix(data.metadata.dates.voting).format(dt_format)}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Finish date
                        </div>
                        <div className="text-sm">
                            {moment.unix(data.metadata.dates.finish).format(dt_format)}
                        </div>
                    </div>
                </>
            )}

            {!!data.tags?.length && (
                <div className="flex flex-wrap items-center gap-6">
                    <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                        Expert tags
                    </div>
                    <div className="text-sm flex flex-wrap items-center gap-3">
                        {data.tags.map((tag: string) => (
                            <BadgeExpertTag key={tag} content={tag} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export { HackathonUpdateEvent }
