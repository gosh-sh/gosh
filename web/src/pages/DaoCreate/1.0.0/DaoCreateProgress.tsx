import { TDaoCreateProgress } from 'react-gosh'
import { UILog, UILogItem } from '../../../components/UILog'

type TDaoCreateProgressProps = {
    progress: TDaoCreateProgress
    className?: string
}

const DaoCreateProgress = (props: TDaoCreateProgressProps) => {
    const { progress, className } = props

    if (!progress.isFetching) return null
    return (
        <UILog className={className}>
            <UILogItem result={progress.isDaoDeployed}>Deploy DAO</UILogItem>
        </UILog>
    )
}

export default DaoCreateProgress
