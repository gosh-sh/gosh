import { TBranchOperateProgress } from 'react-gosh/dist/types/repo.types'
import { UILog, UILogItem } from '../UILog'

type TBranchOperateProgressProps = {
  operation: string
  progress: TBranchOperateProgress
}

const BranchOperateProgress = (props: TBranchOperateProgressProps) => {
  const { operation, progress } = props
  const { snapshotsRead, snapshotsWrite, completed } = progress

  const getCountersFlag = (counter?: {
    count?: number
    total?: number
  }): boolean | undefined => {
    if (!counter) return undefined

    const { count = 0, total = 0 } = counter
    return count === total ? true : undefined
  }

  return (
    <UILog>
      <UILogItem result={snapshotsRead}>Get snapshots...</UILogItem>
      <UILogItem result={getCountersFlag(snapshotsWrite)}>
        {operation} snapshots... ({snapshotsWrite?.count}/{snapshotsWrite?.total})
      </UILogItem>
      <UILogItem result={completed}>{operation} branch...</UILogItem>
    </UILog>
  )
}

export { BranchOperateProgress }
