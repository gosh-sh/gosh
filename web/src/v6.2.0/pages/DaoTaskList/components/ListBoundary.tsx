import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { ListItem, ListItemHeader, ListItemSkeleton } from './ListItem'
import { ListItemMilestone } from './ListItemMilestone'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { Button } from '../../../../components/Form'
import classNames from 'classnames'
import { useEffect } from 'react'
import Alert from '../../../../components/Alert'
import { useDaoMember, useDaoTaskList } from '../../../hooks/dao.hooks'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { MilestoneCreateModal } from '../../../components/Modal'

const ListBoundaryInner = () => {
    const setModal = useSetRecoilState(appModalStateAtom)
    const member = useDaoMember()
    const taskList = useDaoTaskList({ count: 10, initialize: true })
    const { showBoundary } = useErrorBoundary()

    const onCreateMilestone = () => {
        setModal({
            static: true,
            isOpen: true,
            element: <MilestoneCreateModal />,
        })
    }

    const onGetNext = async () => {
        try {
            await taskList.getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (taskList.error) {
            showBoundary(taskList.error)
        }
    }, [taskList.error])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-e6edff">
                <ListItemHeader />
                {taskList.isFetching && !taskList.items.length && <ListItemSkeleton />}
                {taskList.isEmpty && (
                    <div className="text-sm text-gray-7c8db5 text-center p-4">
                        There are no tasks
                    </div>
                )}
                {taskList.items.map((item, index) =>
                    item.isMilestone ? (
                        <ListItemMilestone key={index} item={item} />
                    ) : (
                        <ListItem key={index} item={item} />
                    ),
                )}
            </div>

            {member.isMember && (
                <div className="px-5 mb-3">
                    <Button
                        type="button"
                        variant="custom"
                        className="!px-0 text-gray-53596d text-sm hover:text-black"
                        onClick={onCreateMilestone}
                    >
                        Create milestone...
                    </Button>
                </div>
            )}

            {taskList.hasNext && (
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={taskList.isFetching}
                    isLoading={taskList.isFetching}
                    onClick={onGetNext}
                >
                    Show more
                </Button>
            )}
        </div>
    )
}

const ListBoundary = withErrorBoundary(ListBoundaryInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch DAO tasks error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }
