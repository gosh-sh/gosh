import CopyClipboard from '../../components/CopyClipboard'
import { TDaoMemberListItem, shortString } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'

type TMemberListItemProps = {
    item: TDaoMemberListItem
    daoOwner: string
    isDaoOwner: boolean
    isFetching: boolean
    onDelete(username: string): Promise<void>
}

const DaoMemberListItem = (props: TMemberListItemProps) => {
    const { item, daoOwner, isDaoOwner, isFetching, onDelete } = props

    return (
        <div className="flex flex-wrap gap-x-4 items-center justify-between py-2">
            <div>
                <p className="text-lg mb-1">{item.name}</p>
                <div className="flex flex-wrap gap-x-5 items-center text-sm text-gray-606060">
                    <CopyClipboard
                        componentProps={{ text: item.wallet }}
                        label={
                            <>
                                <span className="mr-2">Wallet:</span>
                                {shortString(item.wallet, 9, 9)}
                            </>
                        }
                    />

                    {item.profile && (
                        <CopyClipboard
                            componentProps={{ text: item.profile }}
                            label={
                                <>
                                    <span className="mr-2">Profile:</span>
                                    {shortString(item.profile, 9, 9)}
                                </>
                            }
                        />
                    )}

                    <div>
                        <span className="mr-2">Token balance:</span>
                        {item.smvBalance}
                    </div>
                </div>
            </div>
            {isDaoOwner && (
                <div>
                    <button
                        type="button"
                        className="px-2.5 py-1.5 text-white text-xs rounded bg-rose-600
                                        hover:bg-rose-500 disabled:bg-rose-400"
                        onClick={() => onDelete(item.name)}
                        disabled={item.profile === daoOwner || isFetching}
                    >
                        {isFetching ? (
                            <Spinner size="xs" />
                        ) : (
                            <FontAwesomeIcon icon={faTrash} size="sm" />
                        )}

                        <span className="ml-2">Delete</span>
                    </button>
                </div>
            )}
        </div>
    )
}

export default DaoMemberListItem
