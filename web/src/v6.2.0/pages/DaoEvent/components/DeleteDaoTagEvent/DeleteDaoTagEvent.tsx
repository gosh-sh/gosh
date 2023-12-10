type TDeleteDaoTagEventProps = {
    data: { daotag: string[] }
}

const DeleteDaoTagEvent = (props: TDeleteDaoTagEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Tags
                </div>
                <div className="text-sm">{data.daotag.join(' ')}</div>
            </div>
        </div>
    )
}

export { DeleteDaoTagEvent }
