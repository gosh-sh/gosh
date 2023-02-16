import { classNames, useTopicList } from 'react-gosh'
import { useOutletContext } from 'react-router-dom'
import { Button, ButtonLink } from '../../components/Form'
import Loader from '../../components/Loader'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { TopicListItem } from './components/ListItem'

const TopicsPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items, isFetching, isEmpty, hasNext, getMore } = useTopicList(dao.adapter, {
        perPage: 5,
    })

    return (
        <div>
            <div className="mb-7 text-right">
                {dao.details.isAuthMember && (
                    <ButtonLink to={`/o/${dao.details.name}/topics/create`}>
                        Create topic
                    </ButtonLink>
                )}
            </div>

            <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                {isFetching && !items.length && (
                    <Loader className="p-4">Loading topics...</Loader>
                )}

                {isEmpty && (
                    <div className="text-gray-7c8db5 text-sm text-center p-4">
                        There are no topics
                    </div>
                )}

                <div className="divide-y divide-gray-e6edff">
                    {items.map((item, index) => (
                        <TopicListItem key={index} dao={dao.details} item={item} />
                    ))}
                </div>

                {hasNext && (
                    <Button
                        type="button"
                        className={classNames(
                            'w-full',
                            '!rounded-none',
                            '!text-gray-7c8db5 !bg-gray-fafafd',
                            'disabled:opacity-70',
                        )}
                        disabled={isFetching}
                        isLoading={isFetching}
                        onClick={getMore}
                    >
                        Show more
                    </Button>
                )}
            </div>
        </div>
    )
}

export default TopicsPage
