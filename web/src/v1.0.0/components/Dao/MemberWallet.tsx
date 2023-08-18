import { useCallback } from 'react'
import classNames from 'classnames'
import { useDaoMember } from '../../hooks/dao.hooks'

type TDaoWalletSideProps = React.HTMLAttributes<HTMLDivElement>

const DaoMemberWallet = (props: TDaoWalletSideProps) => {
    const { className } = props
    const member = useDaoMember()

    const getUserBalance = useCallback(() => {
        if (!member.details.balance) {
            return 0
        }
        const voting = Math.max(
            member.details.balance.total,
            member.details.balance.locked,
        )
        return voting + member.details.balance.regular
    }, [member.details.balance])

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div>
                <div className="mb-1 text-gray-7c8db5 text-sm">Your wallet balance</div>
                <div className="text-xl font-medium">
                    {getUserBalance().toLocaleString()}
                </div>
            </div>

            {member.details.isMember && (
                <>
                    <hr className="my-4 bg-gray-e6edff" />
                    <div>
                        <div className="mb-1 text-gray-7c8db5 text-sm">Karma</div>
                        <div className="text-xl font-medium">
                            {member.details.allowance?.toLocaleString()}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export { DaoMemberWallet }
