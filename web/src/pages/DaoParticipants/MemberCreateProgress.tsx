import { classNames, shortString, TDaoMemberCreateProgress } from 'react-gosh'
import UILogItem from '../../components/UILog/UILogItem'

type TDaoMemberCreateProgressProps = {
    progress: TDaoMemberCreateProgress
    className?: string
}

const DaoMemberCreateProgress = (props: TDaoMemberCreateProgressProps) => {
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
                            Add participant {shortString(item.pubkey)}
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

export default DaoMemberCreateProgress
