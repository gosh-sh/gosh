import { BadgeExpertTag } from '../../../../components/Badge'

type TDaoExpertTagDeleteEventProps = {
    data: { tags: string[] }
}

const DaoExpertTagDeleteEvent = (props: TDaoExpertTagDeleteEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Expert tags
                </div>
                <div className="flex items-center gap-x-2">
                    {data.tags.map((tag, index) => (
                        <BadgeExpertTag key={index} content={tag} className="py-2 px-4" />
                    ))}
                </div>
            </div>
        </div>
    )
}

export { DaoExpertTagDeleteEvent }
