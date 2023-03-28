import { useCallback } from 'react'
import { classNames, TSmvDetails } from 'react-gosh'
import { IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'

type TDaoWalletSideProps = {
    wallet: {
        adapter?: IGoshSmvAdapter
        details: TSmvDetails
    }
    className?: string
}

const DaoWalletSide = (props: TDaoWalletSideProps) => {
    const { wallet, className } = props

    const getUserBalance = useCallback(() => {
        const voting = Math.max(wallet.details.smvAvailable, wallet.details.smvLocked)
        return voting + wallet.details.smvBalance
    }, [wallet.details])

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
        </div>
    )
}

export default DaoWalletSide
