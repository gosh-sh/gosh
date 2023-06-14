type TBigTaskDeleteEventProps = {
    data: any
}

const BigTaskDeleteEvent = (props: TBigTaskDeleteEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-y-1">
            <pre className="text-xs">{JSON.stringify(data, undefined, 2)}</pre>
        </div>
    )
}

export { BigTaskDeleteEvent }
