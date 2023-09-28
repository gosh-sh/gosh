import { AnimatePresence, motion } from 'framer-motion'
import { useBridgeTransfer } from '../../hooks/bridge.hooks'
import { CompleteStep, TransferStep, RouteStep, Breadcrumbs } from './components'
import { shortString } from '../../../utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import { useEffect } from 'react'
import Alert from '../../../components/Alert'
import CopyClipboard from '../../../components/CopyClipboard'
import { round2precision } from '../../../helpers'

const motionProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25 },
}

const BridgePage = () => {
    const { networks, summary, step, reset } = useBridgeTransfer({
        initialize: true,
    })

    useEffect(() => {
        return () => {
            reset()
        }
    }, [])

    return (
        <div className="flex flex-wrap items-start justify-center gap-16">
            <div className="grow">
                <h1 className="text-3xl font-medium mb-4">Cross-chain transfer</h1>
                <Alert variant="warning" className="mb-6">
                    <h3 className="font-medium">Ethereum bridge Alfa testing!</h3>
                    <div>
                        The contract has not been very formally verified yet. Set them a
                        little.
                    </div>
                    <div className="mt-3">
                        Gosh to Gosh transactions are temporary unavailable.
                    </div>
                </Alert>
                <div className="my-10">
                    <Breadcrumbs />
                </div>

                <AnimatePresence mode="wait">
                    {step === 'route' && (
                        <motion.div key="route" {...motionProps}>
                            <RouteStep />
                        </motion.div>
                    )}
                    {step === 'transfer' && (
                        <motion.div key="transfer" {...motionProps}>
                            <TransferStep />
                        </motion.div>
                    )}
                    {step === 'complete' && (
                        <motion.div key="complete" {...motionProps}>
                            <CompleteStep />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="basis-full lg:basis-4/12 shrink-0">
                <div className="border border-gray-e6edff rounded-xl py-5">
                    <h3 className="px-5 text-xl font-medium">Summary</h3>

                    <div className="py-8 px-5 flex flex-col gap-y-5 border-b border-b-gray-e6edff">
                        <div className="flex items-center justify-between text-sm">
                            <div className="grow">
                                <div className="inline-block w-12 text-gray-7c8db5 font-medium">
                                    From
                                </div>
                                {networks[summary.from.network].label}
                            </div>
                            <div
                                className={classNames(
                                    'grow text-gray-7c8db5',
                                    summary.from.address ? 'block' : 'hidden',
                                )}
                            >
                                <div className="flex flex-nowrap items-center gap-x-3">
                                    <img
                                        src={networks[summary.from.network].iconpath}
                                        className="w-8 ml-auto"
                                        alt="Blockchain"
                                    />
                                    <CopyClipboard
                                        label={shortString(summary.from.address, 6, 6)}
                                        componentProps={{
                                            text: summary.from.address,
                                        }}
                                    />
                                </div>
                                <div className="mt-1 text-right">
                                    {round2precision(
                                        networks[summary.from.network].balance,
                                    )}{' '}
                                    {networks[summary.from.network].token}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="grow">
                                <div className="inline-block w-12 text-gray-7c8db5 font-medium">
                                    To
                                </div>
                                {networks[summary.to.network].label}
                            </div>
                            <div className="grow text-gray-7c8db5">
                                <div className="flex flex-nowrap items-center gap-x-3">
                                    <img
                                        src={networks[summary.to.network].iconpath}
                                        className="w-8 ml-auto"
                                        alt="Blockchain"
                                    />
                                    <CopyClipboard
                                        label={shortString(summary.to.address, 6, 6)}
                                        componentProps={{
                                            text: summary.to.address,
                                        }}
                                    />
                                </div>
                                <div className="mt-1 text-right">
                                    {round2precision(
                                        networks[summary.to.network].balance,
                                    )}{' '}
                                    {networks[summary.to.network].token}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="py-8 px-5 flex flex-col gap-y-5 border-b border-b-gray-e6edff">
                        <div className="flex items-center justify-between">
                            <div className="grow font-medium">Token</div>
                            <div className="grow text-end">
                                <span className="font-medium">
                                    {networks[summary.from.network].token}
                                </span>
                                <FontAwesomeIcon
                                    icon={faArrowRightLong}
                                    className="mx-3"
                                />
                                <span className="font-medium">
                                    {networks[summary.to.network].token}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 px-5 flex flex-col gap-y-5">
                        <div className="flex items-center justify-between font-medium">
                            <div className="grow">Send</div>
                            <div className="grow text-end">
                                {summary.from.amount.toLocaleString()}{' '}
                                {networks[summary.from.network].token}
                            </div>
                        </div>
                        <div className="flex items-center justify-between font-medium">
                            <div className="grow">Receive</div>
                            <div className="grow text-end ">
                                {summary.to.amount.toLocaleString()}{' '}
                                {networks[summary.to.network].token}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BridgePage
