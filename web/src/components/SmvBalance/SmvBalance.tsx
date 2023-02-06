import { faCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { toast } from 'react-toastify'
import { TSmvDetails, useSmvTokenTransfer } from 'react-gosh'
import { classNames } from 'react-gosh'
import Spinner from '../Spinner'
import { IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'
import ToastError from '../Error/ToastError'

type TSmvBalanceProps = {
    adapter?: IGoshSmvAdapter
    details: TSmvDetails
    className?: string
}

const SmvBalance = (props: TSmvBalanceProps) => {
    const { adapter, details, className } = props
    const { releaseAll, progress } = useSmvTokenTransfer(adapter)

    const onTokensRelease = async () => {
        try {
            await releaseAll()
            toast.success('Token release was sent, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
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
                    {details.smvAvailable}
                </div>
                <div>
                    <span className="font-semibold mr-2">Locked:</span>
                    {details.smvLocked}
                </div>
                <div>
                    <span className="font-semibold mr-2">Wallet balance:</span>
                    {details.smvBalance}
                </div>
                <div className="grow text-right absolute right-3 top-3 md:relative md:right-auto md:top-auto">
                    <FontAwesomeIcon
                        icon={faCircle}
                        className={classNames(
                            'ml-2',
                            details.isLockerBusy ? 'text-rose-600' : 'text-green-900',
                        )}
                    />
                </div>
                <div>
                    <button
                        type="button"
                        className="btn btn--body text-sm px-4 py-1.5"
                        onClick={onTokensRelease}
                        disabled={progress.releaseAll || details.isLockerBusy}
                    >
                        {progress.releaseAll && <Spinner className="mr-2" />}
                        Release
                    </button>
                </div>
            </div>
        </>
    )
}

export default SmvBalance
