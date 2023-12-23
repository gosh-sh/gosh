import { TBranchCompareProgress } from 'react-gosh/dist/types/repo.types'
import { UILog, UILogItem } from '../UILog'

type TBranchCompareProgressProps = TBranchCompareProgress

const BranchCompareProgress = (props: TBranchCompareProgressProps) => {
  const { trees, blobs } = props

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
      <UILogItem result={trees}>Get trees...</UILogItem>
      <UILogItem result={getCountersFlag(blobs)}>
        Get snapshots... ({blobs?.count}/{blobs?.total})
      </UILogItem>
    </UILog>
  )
}

export { BranchCompareProgress }
