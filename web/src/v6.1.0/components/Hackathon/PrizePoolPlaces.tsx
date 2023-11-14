import classNames from 'classnames'

type TPrizePoolPlacesProps = React.HTMLAttributes<HTMLDivElement> & {
    places: number[]
}

const HackathonPrizePoolPlaces = (props: TPrizePoolPlacesProps) => {
    const { places, className } = props

    return (
        <div className={classNames('flex flex-col gap-2', className)}>
            {places.map((amount, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                    <div className="text-lg font-medium text-[#FF8412]">
                        Place #{index + 1}
                    </div>
                    <div className="text-lg">{amount.toLocaleString()}</div>
                </div>
            ))}
        </div>
    )
}

export { HackathonPrizePoolPlaces }
