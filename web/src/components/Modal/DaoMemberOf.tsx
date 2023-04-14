import { Dialog } from '@headlessui/react'
import { IGoshDaoAdapter, IGoshWallet } from 'react-gosh/dist/gosh/interfaces'
import {
    executeByChunk,
    GoshError,
    MAX_PARALLEL_READ,
    TDao,
    useUser,
    whileFinite,
} from 'react-gosh'
import { useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'
import { Button } from '../Form'
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { Tooltip } from 'react-tooltip'
import { Formik, Form } from 'formik'
import { toast } from 'react-toastify'
import { ToastError, ToastSuccess } from '../Toast'

type TDaoMemberOfModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

type TItem = {
    name: string
    walletCurr?: IGoshWallet
    walletPrev: IGoshWallet
    versionPrev: string
    balance: number
    untransferred: number
    allowance: number
}

const DaoMemberOfModal = (props: TDaoMemberOfModalProps) => {
    const { dao } = props
    const resetModal = useResetRecoilState(appModalStateAtom)
    const { user } = useUser()
    const [daos, setDaos] = useState<TItem[]>([])

    const onTransferDaoTokens = async (params: TItem) => {
        const { walletCurr, walletPrev, versionPrev, untransferred } = params

        try {
            // Get prev version of current dao and check if current user was
            // a member of prev dao version
            const prevDao = await dao.adapter.getPrevDao()
            let prevDaoUserWallet: IGoshWallet | undefined
            if (prevDao) {
                prevDaoUserWallet = await prevDao.getMemberWallet({
                    profile: user.profile,
                    keys: user.keys,
                })
            }

            if (!prevDaoUserWallet || !(await prevDaoUserWallet.isDeployed())) {
                throw new GoshError(
                    'Transfer error',
                    'Only a member of previous version of DAO can transfer tokens',
                )
            }

            // Start token transfer
            await prevDaoUserWallet.run('daoAskUnlockAfterTombstone', {
                wallet: walletPrev.address,
            })
            await dao.adapter.transferDaoToken({
                walletPrev: walletPrev.address,
                walletCurr: walletCurr!.address,
                amount: untransferred,
                versionPrev,
            })

            toast.success(<ToastSuccess message={{ title: 'Proposal created' }} />)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getDetails = async () => {
            const gosh = dao.adapter.getGosh()
            const items = await executeByChunk(
                dao.details.isMemberOf,
                MAX_PARALLEL_READ,
                async (item) => {
                    let parentDao = await gosh.getDao({
                        address: item.dao,
                        useAuth: false,
                    })
                    const parentDaoName = await parentDao.getName()
                    const { value1: parentDaoVersion } = await parentDao.dao.runLocal(
                        'getVersion',
                        {},
                    )

                    // Get DAO wallet balance in current parent DAO
                    const wallet = await parentDao.getMemberWallet({
                        address: item.wallet,
                    })
                    const smv = await parentDao.getSmv()
                    const balance = await smv.getDetails(wallet)
                    const wallets: any = {
                        walletCurr: undefined,
                        walletPrev: wallet,
                        versionPrev: parentDaoVersion,
                        balance: balance.smvBalance + balance.smvAvailable,
                        untransferred: 0,
                        allowance: balance.allowance,
                    }

                    // Check if parent DAO version = current DAO version exists
                    if (parentDaoVersion !== dao.details.version) {
                        const currVersionParentDao = await gosh.getDao({
                            name: parentDaoName,
                            useAuth: false,
                        })
                        if (await currVersionParentDao.isDeployed()) {
                            const wallet = await currVersionParentDao.getMemberWallet({
                                profile: dao.details.address,
                                create: true,
                            })
                            const waitWallet = await whileFinite(async () => {
                                return await wallet.isDeployed()
                            })

                            if (waitWallet) {
                                const smv = await currVersionParentDao.getSmv()
                                const balance = await smv.getDetails(wallet)

                                wallets.walletCurr = wallet
                                wallets.untransferred = wallets.balance
                                wallets.balance =
                                    balance.smvBalance + balance.smvAvailable
                                wallets.allowance = balance.allowance
                            } else {
                                console.warn('DAO deploy limited wallet timeout')
                            }
                        }
                    }

                    return {
                        name: parentDaoName,
                        ...wallets,
                    }
                },
            )
            setDaos(items)
        }

        _getDetails()
    }, [dao.adapter, dao.details.isMemberOf])

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-2xl">
            <div className="absolute right-2 top-2">
                <button className="px-3 py-2 text-gray-7c8db5" onClick={resetModal}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
            </div>
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                Wallet's Owner
            </Dialog.Title>

            <div className="border border-gray-e6edff rounded-xl p-2">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-gray-53596d text-xs text-left">
                                <th className="p-2 font-normal">Organization name</th>
                                <th className="p-2 font-normal">DAO token</th>
                                <th className="p-2 font-normal">Karma</th>
                                <th className="p-2 font-normal"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {daos.map((item, index) => (
                                <tr key={index}>
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2">
                                        {item.balance.toLocaleString()}
                                        {!!item.untransferred && (
                                            <span
                                                className="text-xs text-red-dd3a3a ml-2"
                                                data-tooltip-id={`untransferred-tip`}
                                            >
                                                +{item.untransferred}
                                                <FontAwesomeIcon
                                                    icon={faQuestionCircle}
                                                    className="ml-1"
                                                />
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {item.allowance.toLocaleString()}
                                    </td>
                                    <td className="p-2">
                                        {!!item.untransferred && item.walletCurr && (
                                            <Formik
                                                initialValues={{}}
                                                onSubmit={async () => {
                                                    await onTransferDaoTokens(item)
                                                }}
                                            >
                                                {({ isSubmitting }) => (
                                                    <Form>
                                                        <Button
                                                            type="submit"
                                                            variant="custom"
                                                            className="!py-0 text-gray-7c8db5"
                                                            isLoading={isSubmitting}
                                                            disabled={isSubmitting}
                                                        >
                                                            Transfer from prev
                                                        </Button>
                                                    </Form>
                                                )}
                                            </Formik>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Tooltip id="untransferred-tip">
                <div>Untransferred tokens from previous version</div>
            </Tooltip>
        </Dialog.Panel>
    )
}

export default DaoMemberOfModal
