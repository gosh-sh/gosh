import { TSmvEvent } from 'react-gosh'

type TEventProgressBarProps = {
    votes?: TSmvEvent['votes']
}

const EventProgressBar = (props: TEventProgressBarProps) => {
    const { votes } = props

    const calculateVotesPercent = () => {
        const { yes = 0, no = 0, total = 1 } = votes || {}
        if (yes === total) {
            return ['90%', '10%']
        }
        if (no === total) {
            return ['10%', '90%']
        }
        if (yes > no) {
            let ypercent = 50 + ((yes - no) / total) * 100
            if (ypercent > 90) {
                ypercent = 90
            }
            return [`${ypercent}%`, `${100 - ypercent}%`]
        }
        if (yes < no) {
            let npercent = 50 + ((no - yes) / total) * 100
            if (npercent > 90) {
                npercent = 90
            }
            return [`${100 - npercent}%`, `${npercent}%`]
        }
        return ['50%', '50%']
    }

    return (
        <div className="w-full">
            <div
                className="inline-block text-left pr-1"
                style={{
                    width: calculateVotesPercent()[0],
                }}
            >
                <div className="font-medium">{votes?.yes || 0}</div>
                <div className="h-2 overflow-hidden rounded-lg bg-green-34c759 w-full" />
            </div>
            <div
                className="inline-block text-right pl-1"
                style={{
                    width: calculateVotesPercent()[1],
                }}
            >
                <div className="font-medium">{votes?.no || 0}</div>
                <div className="h-2 overflow-hidden rounded-lg bg-red-ff3b30 w-full" />
            </div>
        </div>
    )
}

export { EventProgressBar }
