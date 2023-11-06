import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import StatusBadge from './StatusBadge'
import { isStatusItemDisabled, isStatusItemLoading } from './helpers'

const RouteEthToGosh = () => {
    const { summary, approveErc20, depositErc20, depositEth } = useL2Transfer()

    return (
        <>
            {summary.progress.steps.map((item, index) => (
                <div key={index} className="flex items-center gap-x-11">
                    <div className="basis-3/12">
                        <StatusBadge type={item.status} />
                    </div>
                    <div className="grow text-sm">
                        <h3 className="font-medium">{item.message}</h3>

                        {item.help && <div className="text-xs">{item.help}</div>}

                        <div className="mt-1">
                            {item.status !== 'completed' &&
                                item.type === 'approve_erc20' && (
                                    <Button
                                        size="sm"
                                        disabled={isStatusItemDisabled(item)}
                                        isLoading={isStatusItemLoading(item)}
                                        onClick={approveErc20}
                                    >
                                        Approve
                                    </Button>
                                )}
                            {item.status !== 'completed' &&
                                item.type === 'deposit_erc20' && (
                                    <Button
                                        size="sm"
                                        disabled={isStatusItemDisabled(item)}
                                        isLoading={isStatusItemLoading(item)}
                                        onClick={depositErc20}
                                    >
                                        Deposit
                                    </Button>
                                )}
                            {item.status !== 'completed' && item.type === 'deposit_eth' && (
                                <Button
                                    size="sm"
                                    disabled={isStatusItemDisabled(item)}
                                    isLoading={isStatusItemLoading(item)}
                                    onClick={depositEth}
                                >
                                    Deposit
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </>
    )
}

export default RouteEthToGosh
