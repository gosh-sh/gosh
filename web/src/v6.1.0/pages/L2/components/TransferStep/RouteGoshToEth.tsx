import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import StatusBadge from './StatusBadge'
import { isStatusItemDisabled, isStatusItemLoading } from './helpers'

const RouteGoshToEth = () => {
    const { summary, withdrawEth, withdrawErc20 } = useL2Transfer()

    return (
        <>
            {summary.progress.steps.map((item, index) => (
                <div key={index} className="flex items-center gap-x-11">
                    <div className="basis-3/12">
                        <StatusBadge type={item.status} />
                    </div>
                    <div className="grow text-sm font-medium">
                        {item.message}
                        <div className="mt-1">
                            {item.status !== 'completed' && item.type === 'withdraw_eth' && (
                                <Button
                                    size="sm"
                                    disabled={isStatusItemDisabled(item)}
                                    isLoading={isStatusItemLoading(item)}
                                    onClick={withdrawEth}
                                >
                                    Withdraw
                                </Button>
                            )}
                            {item.status !== 'completed' &&
                                item.type === 'withdraw_erc20' && (
                                    <Button
                                        size="sm"
                                        disabled={isStatusItemDisabled(item)}
                                        isLoading={isStatusItemLoading(item)}
                                        onClick={withdrawErc20}
                                    >
                                        Withdraw
                                    </Button>
                                )}
                        </div>
                    </div>
                </div>
            ))}
        </>
    )
}

export default RouteGoshToEth
