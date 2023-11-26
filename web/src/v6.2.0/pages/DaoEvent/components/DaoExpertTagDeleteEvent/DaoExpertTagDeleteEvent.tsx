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
                <div className="text-sm">{data.tags.join(' ')}</div>
            </div>
        </div>
    )
}

export { DaoExpertTagDeleteEvent }
