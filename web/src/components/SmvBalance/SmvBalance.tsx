import { faCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { EGoshError, GoshError } from '../../types/errors'
import { IGoshWallet, TSmvBalanceDetails } from '../../types/types'
import { classNames } from '../../utils'
import Spinner from '../Spinner'

type TSmvBalanceProps = {
    details: TSmvBalanceDetails
    wallet?: IGoshWallet
    className?: string
}

const SmvBalance = (props: TSmvBalanceProps) => {
    const { details, wallet, className } = props
    const [release, setRelease] = useState<boolean>(false)

    const onTokensRelease = async () => {
        try {
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)
            setRelease(true)
            await wallet.updateHead()
            toast.success('Token release was sent, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(e.message)
        } finally {
            setRelease(false)
        }
    }

    if (!wallet || !wallet.isDaoParticipant) return null
    return (
        <div
            className={classNames(
                className,
                'relative flex px-4 py-3 rounded gap-x-6',
                'flex-col items-start',
                'md:flex-row md:flex-wrap md:items-center',
            )}
        >
            <div>
                <span className="font-semibold mr-2">SMV balance:</span>
                {details.smvBalance}
            </div>
            <div>
                <span className="font-semibold mr-2">Locked:</span>
                {details.smvLocked}
            </div>
            <div>
                <span className="font-semibold mr-2">Wallet balance:</span>
                {details.balance}
            </div>
            <div className="grow text-right absolute right-3 top-3 md:relative md:right-auto md:top-auto">
                <FontAwesomeIcon
                    icon={faCircle}
                    className={classNames(
                        'ml-2',
                        details.smvBusy ? 'text-rose-600' : 'text-green-900',
                    )}
                />
            </div>
            <div>
                <button
                    type="button"
                    className="btn btn--body text-sm px-4 py-1.5"
                    onClick={onTokensRelease}
                    disabled={release || details.smvBusy}
                >
                    {release && <Spinner className="mr-2" />}
                    Release
                </button>
            </div>
        </div>
    )
}

export default SmvBalance
