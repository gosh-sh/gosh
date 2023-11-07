import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import StatusBadge from './StatusBadge'
import { isStatusItemDisabled, isStatusItemLoading } from './helpers'

const RouteGoshToEth = () => {
    const { summary, withdrawGosh, withdrawErc20 } = useL2Transfer()

    const onWithdrawGosh = async () => {
        const isErc20 = !!summary.progress.steps.find((item) => {
            return item.type === 'withdraw_erc20'
        })
        await withdrawGosh({ isErc20 })
    }

    const onWithdrawErc20 = async () => {
        await withdrawErc20({
            rootaddr: summary.to.token.rootaddr!,
            walletaddr: summary.to.wallet,
        })
    }

    return (
        <>
            {summary.progress.steps.map((item, index) => (
                <div key={index} className="flex flex-wrap items-center gap-x-11 gap-y-3">
                    <div className="basis-full md:basis-3/12 shrink-0">
                        <StatusBadge type={item.status} />
                    </div>
                    <div className="grow text-sm font-medium">
                        <h3 className="font-medium">{item.message}</h3>

                        {item.help && <div className="text-xs">{item.help}</div>}

                        <div className="mt-1">
                            {item.status !== 'completed' &&
                                item.type === 'withdraw_gosh' && (
                                    <Button
                                        size="sm"
                                        disabled={isStatusItemDisabled(item)}
                                        isLoading={isStatusItemLoading(item)}
                                        onClick={onWithdrawGosh}
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
                                        onClick={onWithdrawErc20}
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
