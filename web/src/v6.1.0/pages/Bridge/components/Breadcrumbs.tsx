import classNames from 'classnames'
import { useBridgeTransfer } from '../../../hooks/bridge.hooks'

const Breadcrumbs = () => {
    const { step } = useBridgeTransfer()

    return (
        <div className="flex items-center justify-between">
            <div className="grow relative">
                <div
                    className={classNames(
                        'absolute rounded-full w-4 h-4 border border-blue-2b89ff -translate-y-1/2',
                        step === 'route' ? 'bg-white' : 'bg-blue-2b89ff',
                        step === 'complete'
                            ? '!bg-green-34c759 border-green-34c759'
                            : null,
                    )}
                />
                <hr
                    className={classNames(
                        step === 'route' ? 'border-gray-e6edff' : 'border-blue-2b89ff',
                        step === 'complete' ? 'border-green-34c759' : null,
                    )}
                />
                <div className="mt-4">
                    <div
                        className={classNames(
                            'text-sm',
                            step === 'route' ? 'text-gray-53596d' : 'text-gray-e6edff',
                        )}
                    >
                        Step 1
                    </div>
                    <div
                        className={classNames(
                            'mt-1.5 lg:text-xl font-medium',
                            step === 'route' ? null : 'text-gray-e6edff',
                        )}
                    >
                        Select route
                    </div>
                </div>
            </div>

            <div className="grow relative">
                <div
                    className={classNames(
                        'absolute rounded-full w-4 h-4 border border-blue-2b89ff -translate-y-1/2',
                        step === 'complete' ? 'bg-blue-2b89ff' : 'bg-white',
                        step === 'complete'
                            ? '!bg-green-34c759 border-green-34c759'
                            : null,
                    )}
                />
                <hr
                    className={classNames(
                        step === 'complete' ? 'border-blue-2b89ff' : 'border-gray-e6edff',
                        step === 'complete' ? 'border-green-34c759' : null,
                    )}
                />
                <div className="mt-4">
                    <div
                        className={classNames(
                            'text-sm',
                            step === 'transfer' ? 'text-gray-53596d' : 'text-gray-e6edff',
                        )}
                    >
                        Step 2
                    </div>
                    <div
                        className={classNames(
                            'mt-1.5 lg:text-xl font-medium',
                            step === 'transfer' ? null : 'text-gray-e6edff',
                        )}
                    >
                        Transfer
                    </div>
                </div>
            </div>

            <div className="relative">
                <div
                    className={classNames(
                        'absolute rounded-full w-4 h-4 border border-blue-2b89ff -translate-y-1/2 right-0',
                        step === 'complete' ? 'bg-blue-2b89ff' : 'bg-white',
                        step === 'complete'
                            ? '!bg-green-34c759 border-green-34c759'
                            : null,
                    )}
                />
                <hr
                    className={classNames(
                        step === 'complete'
                            ? 'border-green-34c759'
                            : 'border-gray-e6edff',
                    )}
                />
                <div className="mt-4 text-end">
                    <div
                        className={classNames(
                            'text-sm',
                            step === 'complete' ? 'text-gray-53596d' : 'text-gray-e6edff',
                        )}
                    >
                        Step 3
                    </div>
                    <div
                        className={classNames(
                            'mt-1.5 lg:text-xl font-medium',
                            step === 'complete' ? null : 'text-gray-e6edff',
                        )}
                    >
                        Complete
                    </div>
                </div>
            </div>
        </div>
    )
}

export { Breadcrumbs }
