import { classNames, shortString, TDaoMemberCreateProgress } from 'react-gosh'
import { UILog, UILogItem } from '../../components/UILog'

type TDaoMemberCreateProgressProps = {
    progress: TDaoMemberCreateProgress
    className?: string
}

const DaoMemberCreateProgress = (props: TDaoMemberCreateProgressProps) => {
    const { progress, className } = props

    if (!progress.isFetching) return null
    return (
        <UILog className={className}>
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
        </UILog>
    )
}

export default DaoMemberCreateProgress
