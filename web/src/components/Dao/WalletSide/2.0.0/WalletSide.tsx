import { useCallback } from 'react'
import { classNames, TDao, TSmvDetails, useUser } from 'react-gosh'
import { IGoshDaoAdapter, IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { Button } from '../../../Form'
import DaoRequestMembershipModal from '../../../Modal/DaoRequestMembership'
import WalletTokenSendModal from '../../../Modal/WalletTokenSend'

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

    const onDaoTokenSendClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <WalletTokenSendModal dao={dao} wallet={wallet} />,
        })
    }

    const onDaoRequestMembershipClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <DaoRequestMembershipModal dao={dao} />,
        })
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
                                onClick={onDaoTokenSendClick}
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <hr className="my-4 bg-gray-e6edff" />
            <div>
                <div className="mb-1 text-gray-7c8db5 text-sm">Allowance</div>
                <div className="text-xl font-medium">{getUserAllowance()}</div>
                {!dao.details.isAuthMember && dao.details.isAskMembershipOn && (
                    <div className="mt-3">
                        <Button
                            className={classNames(
                                'w-full !border-gray-e6edff bg-gray-fafafd',
                                'hover:!border-gray-53596d',
                            )}
                            variant="custom"
                            onClick={onDaoRequestMembershipClick}
                        >
                            Send a request to DAO
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DaoWalletSide
