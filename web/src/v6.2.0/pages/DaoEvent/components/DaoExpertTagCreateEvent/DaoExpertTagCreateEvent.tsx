import { BadgeExpertTag } from '../../../../components/Badge'

type TDaoExpertTagCreateEventProps = {
    data: { tags: string[]; multiples: string[] }
}

const DaoExpertTagCreateEvent = (props: TDaoExpertTagCreateEventProps) => {
    const { data } = props

    return (
        <div className="pt-3">
            <p className="text-xs text-gray-53596d">Expert tags</p>
            <div className="mt-2 flex flex-col gap-2 py-1">
                {data.tags.map((name, index) => (
                    <div key={index} className="flex items-center gap-6 text-sm">
                        <div className="basis-5/12 xl:basis-3/12">
                            <BadgeExpertTag
                                content={name}
                                className="inline-flex items-center py-2 px-4"
                            />
                        </div>
                        <div>{data.multiples[index]}%</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export { DaoExpertTagCreateEvent }
