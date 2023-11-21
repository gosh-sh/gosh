import { faFolder } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from 'react-router-dom'
import Skeleton from '../../../../components/Skeleton'
import { TGoshRepositoryListItem } from '../../../types/repository.types'

const ListItemSkeleton = () => {
    return (
        <div className="grid grid-flow-col auto-cols-min gap-7">
            {Array.from(new Array(3)).map((_, index) => (
                <div key={index} className="w-28">
                    <div className="p-5 text-center text-black-2/50 rounded-2xl overflow-hidden">
                        <FontAwesomeIcon icon={faFolder} size="4x" />
                    </div>
                    <div className="px-2 py-1 text-sm text-center">
                        <Skeleton skeleton={{ height: 8 }}>
                            <rect x="0" y="0" rx="6" ry="6" width="100%" height="8" />
                        </Skeleton>
                    </div>
                </div>
            ))}
        </div>
    )
}

type TRepositoryListItemProps = {
    dao_name: string
    item: TGoshRepositoryListItem
}

const ListItem = (props: TRepositoryListItemProps) => {
    const { item, dao_name } = props
    const navigate = useNavigate()

    const onDoubleClick = () => {
        navigate(`/o/${dao_name}/r/${item.name}`)
    }

    return (
        <button className="group block w-28 self-start" onDoubleClick={onDoubleClick}>
            <div
                className="p-5 text-center text-black-2 rounded-2xl overflow-hidden
                group-hover:bg-gray-1/50 group-focus:bg-gray-2 transition-colors duration-200"
            >
                <FontAwesomeIcon icon={faFolder} size="4x" />
            </div>
            <div
                className="mt-2 px-2 py-1 text-sm text-center overflow-hidden text-ellipsis
                rounded-lg text-black-2 group-focus:bg-blue-1 group-focus:text-white
                group-focus:break-words"
            >
                {item.name}
            </div>
        </button>
    )
}

export { ListItem, ListItemSkeleton }
