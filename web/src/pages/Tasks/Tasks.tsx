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
            {dao.details.version < '5.0.0' && (
                <div className="mb-7 text-right">
                    {dao.details.isAuthMember && (
                        <ButtonLink to={`/o/${dao.details.name}/tasks/create`}>
                            Create task
                        </ButtonLink>
                    )}
                </div>
            )}

            <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                <div className="w-full overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-gray-7c8db5 text-xs text-left">
                                <th className="font-normal px-5 py-3.5">Task name</th>
                                <th className="font-normal px-5 py-3.5">Repository</th>
                                <th className="font-normal px-5 py-3.5">Reward</th>
                                <th className="font-normal px-5 py-3.5">Status</th>
                                <th className="font-normal px-5 py-3.5">Tags</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching && !items.length && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-2">
                                        <Loader className="text-sm">
                                            Loading tasks...
                                        </Loader>
                                    </td>
                                </tr>
                            )}
                            {isEmpty && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-2 text-gray-7c8db5 text-sm text-center"
                                    >
                                        There are no tasks
                                    </td>
                                </tr>
                            )}
                            {items.map((item, index) => {
                                getItemDetails(item)
                                return <TaskListItem key={index} item={item} dao={dao} />
                            })}
                        </tbody>
                    </table>
                </div>

                {hasNext && (
                    <div className="mt-3">
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
                    </div>
                )}
            </div>
        </div>
    )
}

export default TasksPage
