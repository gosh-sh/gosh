import CopyClipboard from '../../components/CopyClipboard'
import { TDaoMemberListItem, shortString } from 'react-gosh'

type TMemberListItemProps = {
    item: TDaoMemberListItem
}

const DaoMemberListItem = (props: TMemberListItemProps) => {
    const { item } = props

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
        </div>
    )
}

export default DaoMemberListItem
