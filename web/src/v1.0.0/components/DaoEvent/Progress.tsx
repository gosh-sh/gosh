import { getDurationDelta } from '../../../utils'
import { TDaoEventDetails } from '../../types/dao.types'

type TEventProgressBarProps = {
  event: TDaoEventDetails
}

const DaoEventProgressBar = (props: TEventProgressBarProps) => {
  const { event } = props
  const { votes, time, status } = event

  const calculateVotesPercent = () => {
    const { yes = 0, no = 0, total = 1 } = votes
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
        className="inline-block text-left pr-1 transition-all duration-300"
        style={{
          width: calculateVotesPercent()[0],
        }}
      >
        <div className="font-medium">{votes?.yes || 0}</div>
        <div className="h-[0.75rem] overflow-hidden rounded-lg bg-green-34c759 w-full" />
      </div>
      <div
        className="inline-block text-right pl-1 transition-all duration-300"
        style={{
          width: calculateVotesPercent()[1],
        }}
      >
        <div className="font-medium">{votes?.no || 0}</div>
        <div className="h-[0.75rem] overflow-hidden rounded-lg bg-red-ff3b30 w-full" />
      </div>

      <hr className="bg-gray-e6edff my-4" />

      <div className="text-sm text-gray-53596d text-center">
        {status.completed
          ? `Closed at ${new Date(time.completed || time.finish).toLocaleDateString()}`
          : `Ends in ${getDurationDelta(time.finish, '[d:d] [h:h] [m:m]')}`}
      </div>
    </div>
  )
}

export { DaoEventProgressBar }
