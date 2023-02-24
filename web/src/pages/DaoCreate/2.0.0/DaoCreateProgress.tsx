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
            <UILogItem result={progress.isDaoDeployed}>Create DAO</UILogItem>
            <UILogItem result={progress.isDaoAuthorized}>Authorize DAO</UILogItem>
            <UILogItem result={progress.isTokenSetup}>Setup DAO tokens</UILogItem>
            <UILogItem result={progress.isTagsDeployed}>Create DAO tags</UILogItem>
            <UILogItem result={progress.isRepositoryDeployed}>
                Create DAO system repository
            </UILogItem>
            <UILogItem result={progress.isBlobsDeployed}>Save DAO system data</UILogItem>
        </UILog>
    )
}

export default DaoCreateProgress
