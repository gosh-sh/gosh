import { faCoins, faUsers, faHashtag } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { shortString, TDaoListItem } from 'react-gosh'
import { Link } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'

type TDaoListItemProps = {
    item: TDaoListItem
}

const DaoListItem = (props: TDaoListItemProps) => {
    const { item } = props

    return (
        <div className="py-3">
            <Link to={`/${item.name}`} className="text-xl font-semibold hover:underline">
                {item.name}
            </Link>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-gray-606060 text-sm mt-1">
                <div>
                    <FontAwesomeIcon icon={faUsers} className="mr-2" />
                    Members: {item.members?.length}
                </div>
                <div>
                    <FontAwesomeIcon icon={faCoins} className="mr-2" />
                    Total supply: {item.supply}
                </div>
                <CopyClipboard
                    componentProps={{ text: item.address }}
                    label={
                        <>
                            <FontAwesomeIcon icon={faHashtag} className="mr-2" />
                            Address: {shortString(item.address, 9, 9)}
                        </>
                    }
                />
            </div>
        </div>
    )
}

export default DaoListItem
