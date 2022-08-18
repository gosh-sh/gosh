import CopyClipboard from '../../components/CopyClipboard'
import { TDaoMemberListItem, shortString } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'

type TMemberListItemProps = {
    item: TDaoMemberListItem
    daoOwnerPubkey: string
    isDaoOwner: boolean
    isFetching: boolean
    onDelete(pubkey?: string): Promise<void>
}

const DaoMemberListItem = (props: TMemberListItemProps) => {
    const { item, daoOwnerPubkey, isDaoOwner, isFetching, onDelete } = props

    return (
        <div className="py-2 flex flex-wrap gap-x-3 items-center justify-between">
            <CopyClipboard
                className="basis-1/3"
                componentProps={{ text: item.wallet }}
                label={
                    <>
                        <span className="text-gray-606060 text-sm mr-2">Wallet:</span>
                        {shortString(item.wallet, 9, 9)}
                    </>
                }
            />

            {item.pubkey && (
                <CopyClipboard
                    className="basis-1/3"
                    componentProps={{ text: item.pubkey }}
                    label={
                        <>
                            <span className="text-gray-606060 text-sm mr-2">Pubkey:</span>
                            {shortString(item.pubkey, 9, 9)}
                        </>
                    }
                />
            )}

            <div>
                <span className="text-gray-606060 text-sm mr-2">Token balance:</span>
                {item.smvBalance}
            </div>

            {isDaoOwner && (
                <div>
                    <button
                        type="button"
                        className="px-2.5 py-1.5 text-white text-xs rounded bg-rose-600
                                        hover:bg-rose-500 disabled:bg-rose-400"
                        onClick={() => onDelete(item.pubkey)}
                        disabled={item.pubkey === daoOwnerPubkey || isFetching}
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
