import { Form, Formik } from 'formik'
import { useCallback } from 'react'
import { classNames, GoshError, TDao, TSmvDetails, useUser } from 'react-gosh'
import { IGoshDaoAdapter, IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { Button } from '../../../Form'
import WalletTokenSendModal from '../../../Modal/WalletTokenSend'
import { ToastError, ToastSuccess } from '../../../Toast'

type TDaoWalletSideProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    wallet: {
        adapter?: IGoshSmvAdapter
        details: TSmvDetails
    }
    className?: string
}

const DaoWalletSide = (props: TDaoWalletSideProps) => {
    const { dao, wallet, className } = props
    const setModal = useSetRecoilState(appModalStateAtom)
    const { user } = useUser()

    const getUserBalance = useCallback(() => {
        const voting = Math.max(wallet.details.smvAvailable, wallet.details.smvLocked)
        return voting + wallet.details.smvBalance
    }, [wallet.details])

    const getUserAllowance = useCallback(() => {
        if (!dao.details.isAuthMember) {
            return 0
        }

        const member = dao.details.members.find((item) => item.profile === user.profile)
        return member ? member.allowance : 0
    }, [dao.details.isAuthMember, dao.details.members, user.profile])

    const onTokenSendClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <WalletTokenSendModal dao={dao} wallet={wallet} />,
        })
    }

    const onTokenTransferFromPrevDao = async () => {
        try {
            const { value0 } = await dao.adapter.dao.runLocal('getPreviousDaoAddr', {})

            const gosh = dao.adapter.getGosh()
            const daoPrev = await gosh.getDao({ address: value0, useAuth: true })
            const { value1: daoPrevVer } = await daoPrev.dao.runLocal('getVersion', {})
            if (daoPrevVer === '1.0.0') {
                throw new GoshError('Transfer is not needed', {
                    message: 'Transfer from DAO version 1.0.0 is not needed',
                })
            }

            const smvPrev = await daoPrev.getSmv()
            await smvPrev.releaseAll()
            await smvPrev.transferToWallet(0)
            const balance = await smvPrev.getWalletBalance(daoPrev.wallet!)
            await daoPrev.wallet?.run('sendTokenToNewVersion', {
                grant: balance,
                newversion: dao.details.version,
            })

            toast.success(
                <ToastSuccess
                    message={{
                        title: 'Request sent',
                        content:
                            'Token balance will be updated soon. If nothing happens for a long time, please, try again',
                    }}
                />,
            )
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div>
                <div className="mb-1 text-gray-7c8db5 text-sm">Your wallet balance</div>
                <div className="text-xl font-medium">{getUserBalance()}</div>
                {(dao.details.isAuthMember || dao.details.isAuthLimited) && (
                    <div className="mt-3 flex flex-wrap gap-x-3">
                        <div className="grow">
                            <Button
                                className={classNames(
                                    'w-full !border-gray-e6edff bg-gray-fafafd',
                                    'hover:!border-gray-53596d',
                                )}
                                variant="custom"
                                onClick={onTokenSendClick}
                            >
                                Send
                            </Button>
                        </div>
                        <div className="mt-2 grow">
                            <Formik
                                initialValues={{}}
                                onSubmit={onTokenTransferFromPrevDao}
                            >
                                {({ isSubmitting }) => (
                                    <Form>
                                        <Button
                                            type="submit"
                                            className={classNames(
                                                'w-full !border-gray-e6edff bg-gray-fafafd',
                                                'hover:!border-gray-53596d',
                                            )}
                                            variant="custom"
                                            disabled={isSubmitting}
                                            isLoading={isSubmitting}
                                        >
                                            Transfer from previous version
                                        </Button>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    </div>
                )}
            </div>

            {dao.details.isAuthMember && (
                <>
                    <hr className="my-4 bg-gray-e6edff" />
                    <div>
                        <div className="mb-1 text-gray-7c8db5 text-sm">Karma</div>
                        <div className="text-xl font-medium">{getUserAllowance()}</div>
                    </div>
                </>
            )}
        </div>
    )
}

export default DaoWalletSide
