import { classNames, shortString, TDaoCreateProgress } from 'react-gosh'
import UILogItem from '../../components/UILog/UILogItem'

type TDaoCreateProgressProps = {
    progress: TDaoCreateProgress
    className?: string
}

const DaoCreateProgress = (props: TDaoCreateProgressProps) => {
    const { progress, className } = props

    if (!progress.isFetching) return null
    return (
        <div
            className={classNames(
                'text-sm text-gray-050a15/70 bg-gray-050a15/5 rounded p-3',
                className,
            )}
        >
            <code className="flex flex-col gap-2">
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
                            Add member {shortString(item.pubkey)}
                        </UILogItem>

                        <div className="pl-6">
                            <UILogItem result={item.isDeployed}>Deploy wallet</UILogItem>
                            <UILogItem result={item.isMinted}>Mint tokens</UILogItem>
                        </div>
                    </div>
                ))}
            </code>
        </div>
    )
}

export default DaoCreateProgress
