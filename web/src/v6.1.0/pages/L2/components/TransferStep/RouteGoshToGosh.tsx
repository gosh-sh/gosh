import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import StatusBadge from './StatusBadge'
import { isStatusItemDisabled, isStatusItemLoading } from './helpers'

const RouteGoshToGosh = () => {
    const { summary, transferGosh } = useL2Transfer()

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
                            {item.status !== 'completed' && item.type === 'prepare' && (
                                <Button
                                    size="sm"
                                    disabled={isStatusItemDisabled(item)}
                                    isLoading={isStatusItemLoading(item)}
                                    onClick={transferGosh}
                                >
                                    Start
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </>
    )
}

export default RouteGoshToGosh
