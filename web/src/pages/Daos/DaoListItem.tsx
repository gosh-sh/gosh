import { faCoins, faUsers, faHashtag } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames, shortString, TDaoListItem } from 'react-gosh'
import { Link } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import emptylogo from '../../assets/images/emptylogo.svg'

type TDaoListItemProps = {
    className?: string
    item: TDaoListItem
}

const DaoListItem = (props: TDaoListItemProps) => {
    const { className, item } = props

    return (
        <div className={classNames('border rounded-xl flex flex-nowrap p-5', className)}>
            <div className="rounded-xl">
                <img src={emptylogo} alt="" className="w-14 h-14 md:w-20 md:h-20" />
            </div>
            <div className="pl-4">
                <Link
                    to={`/o/${item.name}`}
                    className="text-xl font-medium leading-5 underline"
                >
                    {item.name}
                </Link>

                <span className="ml-2 align-super text-sm font-normal text-gray-53596d">
                    {item.version}
                </span>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-gray-53596d text-xs mt-4">
                    <div>
                        <FontAwesomeIcon icon={faUsers} className="mr-2" />
                        {item.members?.length}
                    </div>
                    <div>
                        <FontAwesomeIcon icon={faCoins} className="mr-2" />
                        {item.supply}
                    </div>
                    <CopyClipboard
                        componentProps={{ text: item.address }}
                        label={
                            <>
                                <FontAwesomeIcon icon={faHashtag} className="mr-2" />
                                {shortString(item.address, 6, 6)}
                            </>
                        }
                    />
                </div>
            </div>
        </div>
    )
}

export default DaoListItem
