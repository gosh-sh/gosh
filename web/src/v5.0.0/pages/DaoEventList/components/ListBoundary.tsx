import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { ListItem, ListItemHeader, ListItemSkeleton } from './ListItem'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { Button } from '../../../../components/Form'
import classNames from 'classnames'
import { useEffect } from 'react'
import Alert from '../../../../components/Alert'
import { useDaoEventList } from '../../../hooks/dao.hooks'

const ListBoundaryInner = () => {
    const eventList = useDaoEventList({ count: 10, initialize: true })
    const { showBoundary } = useErrorBoundary()

    const onGetNext = async () => {
        try {
            await eventList.getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (eventList.error) {
            showBoundary(eventList.error)
        }
    }, [eventList.error])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            {eventList.isFetching && !eventList.items.length && <ListItemSkeleton />}

            {eventList.isEmpty && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    There are no events
                </div>
            )}

            {!!eventList.items.length && (
                <div className="divide-y divide-gray-e6edff">
                    <ListItemHeader />
                    {eventList.items.map((item, index) => (
                        <ListItem key={index} event={item} />
                    ))}
                </div>
            )}

            {eventList.hasNext && (
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={eventList.isFetching}
                    isLoading={eventList.isFetching}
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
            <h3 className="font-medium">Fetch DAO events error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }
