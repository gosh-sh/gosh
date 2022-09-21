import { shortString, TDaoCreateProgress } from 'react-gosh'
import { UILog, UILogItem } from '../../components/UILog'

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
            {progress.members.map((item, index) => (
                <div key={index}>
                    <UILogItem
                        result={
                            [item.isDeployed, item.isMinted].every(
                                (value) => value === undefined,
                            )
                                ? undefined
                                : item.isDeployed && item.isMinted
                        }
                    >
                        Add member {shortString(item.member)}
                    </UILogItem>

                    <div className="pl-6">
                        <UILogItem result={item.isDeployed}>Deploy wallet</UILogItem>
                        <UILogItem result={item.isMinted}>Mint tokens</UILogItem>
                    </div>
                </div>
            ))}
        </UILog>
    )
}

export default DaoCreateProgress
