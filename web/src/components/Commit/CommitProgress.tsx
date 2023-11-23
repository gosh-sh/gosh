import { TPushProgress } from 'react-gosh/dist/types/repo.types'
import { UILog, UILogItem } from '../../components/UILog'

type TCommitProgressProps = React.HTMLAttributes<HTMLDivElement> & TPushProgress

const CommitProgress = (props: TCommitProgressProps) => {
    const {
        isUpgrade,
        treesBuild,
        treesDeploy,
        snapsDeploy,
        diffsDeploy,
        tagsDeploy,
        commitDeploy,
        completed,
        className,
    } = props

    const getCountersFlag = (counter?: {
        count?: number
        total?: number
    }): boolean | undefined => {
        if (!counter) {
            return undefined
        }

        const { count = 0, total = 0 } = counter
        return count === total ? true : undefined
    }

    return (
        <UILog className={className}>
            <div>
                {isUpgrade === true && '[Pushing upgrade commit]'}
                {isUpgrade === false && '[Pushing common commit]'}
            </div>
            <UILogItem result={treesBuild}>Build updated tree...</UILogItem>
            <UILogItem result={getCountersFlag(snapsDeploy)}>
                Deploy snapshots... ({snapsDeploy?.count}/{snapsDeploy?.total})
            </UILogItem>
            <UILogItem result={getCountersFlag(treesDeploy)}>
                Deploy trees... ({treesDeploy?.count}/{treesDeploy?.total})
            </UILogItem>
            <UILogItem result={getCountersFlag(diffsDeploy)}>
                Deploy diffs... ({diffsDeploy?.count}/{diffsDeploy?.total})
            </UILogItem>
            <UILogItem result={getCountersFlag(tagsDeploy)}>
                Deploy tags... ({tagsDeploy?.count}/{tagsDeploy?.total})
            </UILogItem>
            <UILogItem result={commitDeploy}>Deploy commit...</UILogItem>
            <UILogItem result={completed}>
                Create proposal or wait for commit...
            </UILogItem>
        </UILog>
    )
}

export default CommitProgress
