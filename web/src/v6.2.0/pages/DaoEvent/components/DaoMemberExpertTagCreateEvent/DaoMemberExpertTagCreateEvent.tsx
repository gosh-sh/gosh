import { BadgeTag } from '../../../../components/Badge'

type TDaoMemberExpertTagCreateEventProps = {
    data: { tags: string[]; pubaddr: { username: string; profile: string }[] }
}

const DaoMemberExpertTagCreateEvent = (props: TDaoMemberExpertTagCreateEventProps) => {
    const { data } = props

    return (
        <div className="mt-2 flex flex-col gap-2 py-3">
            {data.tags.map((name, index) => (
                <div key={index} className="flex items-center gap-6 text-sm">
                    <div className="basis-5/12 xl:basis-3/12">
                        {data.pubaddr[index].username}
                    </div>
                    <div>
                        <BadgeTag content={name} />
                    </div>
                </div>
            ))}
        </div>
    )
}

export { DaoMemberExpertTagCreateEvent }
