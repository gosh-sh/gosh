import { TDao, TTopic } from 'react-gosh'
import { Link } from 'react-router-dom'

type TTopicListItemProps = {
    dao: TDao
    item: TTopic
}

const TopicListItem = (props: TTopicListItemProps) => {
    const { dao, item } = props

    return (
        <div className="px-5 py-6">
            <div className="mb-2">
                <Link
                    to={`/o/${dao.name}/topics/${item.address}`}
                    className="text-xl text-blue-348eff font-medium"
                >
                    {item.name}
                </Link>
            </div>
            <div className="text-gray-7c8db5 text-sm">{item.content}</div>
        </div>
    )
}

export { TopicListItem }
