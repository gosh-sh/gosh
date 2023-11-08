import moment from 'moment'
import { useCallback, useEffect, useState } from 'react'

type THackathonStatusProps = {
    dates: { start: number; voting: number; finish: number }
}

const HackathonStatus = (props: THackathonStatusProps) => {
    const { dates } = props
    const [duration, setDuration] = useState<{
        prefix: string
        duration: moment.Duration | null
    }>()

    const getDuration = useCallback(() => {
        const now = moment()
        const now_unix = now.unix()

        let prefix = 'Starting'
        if (now_unix >= dates.start) {
            prefix = 'Ongoing'
        }
        if (now_unix >= dates.voting) {
            prefix = 'Voting'
        }
        if (now_unix >= dates.finish) {
            prefix = 'Finished'
        }

        const filtered_now = Object.values(dates).filter((n) => n >= now_unix)
        if (filtered_now.length > 0) {
            const min_unix = Math.min(...filtered_now)
            const min = moment.unix(min_unix)
            const diff = now_unix < min_unix ? min.diff(now) : now.diff(min)
            setDuration({ prefix, duration: moment.duration(diff) })
        } else {
            setDuration({ prefix, duration: null })
        }
    }, [dates.start, dates.voting, dates.finish])

    useEffect(() => {
        getDuration()
        const interval = setInterval(getDuration, 60000)

        return () => {
            clearInterval(interval)
        }
    }, [getDuration])

    return (
        <>
            {duration?.prefix}
            {duration?.duration &&
                ` ${duration?.duration.days()} days ${duration?.duration.hours()} hours left`}
        </>
    )
}

export { HackathonStatus }
