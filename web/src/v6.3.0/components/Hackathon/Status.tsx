import moment from 'moment'
import { useCallback, useEffect, useState } from 'react'

type THackathonStatusProps = {
  dates: { start: number; voting: number; finish: number }
}

const HackathonStatus = (props: THackathonStatusProps) => {
  const { dates } = props
  const [{ prefix, duration }, setDuration] = useState<{
    prefix: string
    duration: moment.Duration | null
  }>({ prefix: '', duration: null })

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
    if (Object.values(dates).some((v) => v === 0)) {
      prefix = 'Draft'
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
      {prefix}
      {duration && (
        <>
          {duration.months() > 0 && ` ${duration.months()} months`}
          {duration.days() > 0 && ` ${duration.days()} days`}
          {` ${duration.hours()} hours`}
          {` ${duration.minutes()} minutes left`}
        </>
      )}
    </>
  )
}

export { HackathonStatus }
