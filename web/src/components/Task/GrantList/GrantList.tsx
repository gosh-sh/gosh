import moment from 'moment'
import { lockToStr } from '../helpers'

type TTaskGrantList = {
  config: any
  locktime?: number
}

const TaskGrantList = (props: TTaskGrantList) => {
  const { config, locktime = 0 } = props

  const getUnlockDate = (unixtime: number, duration: number) => {
    let formatted: string
    if (unixtime > 0) {
      const date = moment.unix(unixtime + duration)
      formatted = date.format('MMM D, YYYY')
    } else {
      formatted = lockToStr(duration)
    }
    return formatted
  }

  const getGrantList = () => {
    if (!config) {
      return []
    }

    const { assign, review, manager, subtask = [] } = config
    const maxLen = Math.max(assign.length, review.length, manager.length, subtask.length)
    const list = []
    for (let i = 0; i < maxLen; i++) {
      const lock = (assign[i] || review[i] || manager[i]).lock
      list.push({
        lock,
        assign: assign[i] ? assign[i].grant : 0,
        review: review[i] ? review[i].grant : 0,
        manager: manager[i] ? manager[i].grant : 0,
        subtask: subtask[i] ? subtask[i].grant : 0,
      })
    }
    return list
  }

  return (
    <table className="w-full">
      <thead className="text-gray-7c8db5 text-xs text-left">
        <tr>
          <th className="font-light px-2">Lock/Vesting</th>
          <th className="font-light px-2">Assigners</th>
          <th className="font-light px-2">Reviewers</th>
          <th className="font-light px-2">Managers</th>
          {!!config.subtask && <th className="font-light px-2">Subtasks</th>}
        </tr>
      </thead>
      <tbody>
        {getGrantList().map((item: any, index: number) => (
          <tr key={index} className="font-mono text-sm">
            <td className="px-2">{getUnlockDate(locktime, item.lock)}</td>
            <td className="px-2">{parseInt(item.assign).toLocaleString()}</td>
            <td className="px-2">{parseInt(item.review).toLocaleString()}</td>
            <td className="px-2">{parseInt(item.manager).toLocaleString()}</td>
            {!!config.subtask && (
              <td className="px-2">{parseInt(item.subtask).toLocaleString()}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export { TaskGrantList }
