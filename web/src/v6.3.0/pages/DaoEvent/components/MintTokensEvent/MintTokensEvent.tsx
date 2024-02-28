type TMintTokensEventProps = {
    data: { grant: number }
}

const MintTokensEvent = (props: TMintTokensEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="text-xs text-gray-53596d">Number of tokens to mint</div>
                <div className="text-sm">{data.grant.toLocaleString()}</div>
            </div>
        </div>
    )
}

export { MintTokensEvent }
