import { useEffect, useState } from 'react'
import { TSmvBalanceDetails, useUser } from 'react-gosh'
import { IGoshDaoAdapter, IGoshWallet } from 'react-gosh/dist/gosh/interfaces'

export const useSmvBalance = (dao: IGoshDaoAdapter, isAuthenticated: boolean) => {
    const { user } = useUser()
    const [details, setDetails] = useState<TSmvBalanceDetails>({
        balance: 0,
        smvBalance: 0,
        smvLocked: 0,
        smvBusy: false,
        numClients: 0,
        goshBalance: 0,
        goshLockerBalance: 0,
    })
    const [wallet, setWallet] = useState<IGoshWallet>()

    useEffect(() => {
        const getDetails = async () => {
            if (!isAuthenticated) return

            const wallet = await dao._getWallet(0, user.keys)
            const balance = await wallet.getSmvTokenBalance()
            const goshBalance = parseInt(await wallet.account.getBalance()) / 1e9
            const locker = await wallet.getSmvLocker()
            const details = await locker.getDetails()
            setWallet(wallet)
            setDetails((state) => ({
                ...state,
                balance,
                smvBalance: details.tokens.total,
                smvLocked: details.tokens.locked,
                smvBusy: details.isBusy,
                numClients: details.numClients,
                goshBalance: goshBalance,
                goshLockerBalance: details.goshLockerBalance,
            }))
        }

        getDetails()
        const interval = setInterval(async () => {
            try {
                await getDetails()
            } catch (e: any) {
                console.error(e.message)
            }
        }, 5000)

        return () => {
            clearInterval(interval)
        }
    }, [dao, isAuthenticated, user.keys])

    return { wallet, details }
}
