import { classNames, useTaskList } from 'react-gosh'
import { useOutletContext } from 'react-router-dom'
import { Button, ButtonLink } from '../../components/Form'
import Loader from '../../components/Loader'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { TaskListItem } from './components'

const TasksPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items, isFetching, isEmpty, hasNext, getMore, getItemDetails } = useTaskList(
        dao.adapter,
        { perPage: 5 },
    )

    return (
        <div>
            <div className="mb-7 text-right">
                {dao.details.isAuthMember && (
                    <ButtonLink to={`/o/${dao.details.name}/tasks/create`}>
                        Create task
                    </ButtonLink>
                )}
            </div>

            <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                {isFetching && !items.length && (
                    <Loader className="p-4">Loading tasks...</Loader>
                )}

                {isEmpty && (
                    <div className="text-gray-7c8db5 text-sm text-center p-4">
                        There are no tasks
                    </div>
                )}

                <div className="divide-y divide-gray-e6edff">
                    {items.map((item, index) => {
                        getItemDetails(item)
                        return <TaskListItem key={index} item={item} dao={dao} />
                    })}
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

export default TasksPage