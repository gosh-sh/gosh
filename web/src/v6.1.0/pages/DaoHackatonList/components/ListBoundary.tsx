import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { ListItem, ListItemSkeleton } from './ListItem'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { Button } from '../../../../components/Form'
import classNames from 'classnames'
import { useEffect } from 'react'
import Alert from '../../../../components/Alert'
import { useDao } from '../../../hooks/dao.hooks'
import { useDaoHackatonList } from '../../../hooks/hackaton.hooks'

const ListBoundaryInner = (props: { count: number }) => {
    const { count } = props
    const dao = useDao()
    const hackatons = useDaoHackatonList({ initialize: true, count })
    const { showBoundary } = useErrorBoundary()

    const is_fetching = dao.isFetching || dao.isFetchingData || hackatons.is_fetching

    const onGetNext = async () => {
        try {
            await hackatons.getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (hackatons.error) {
            showBoundary(hackatons.error)
        }
    }, [hackatons.error])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            {is_fetching && !hackatons.items.length && <ListItemSkeleton />}

            {!is_fetching && hackatons.is_empty && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    There are no hackatons yet
                </div>
            )}

            <div className="divide-y divide-gray-e6edff">
                {hackatons.items.map((item, index) => (
                    <ListItem key={index} dao_name={dao.details.name!} item={item} />
                ))}
            </div>

            {hackatons.has_next && (
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={hackatons.is_fetching}
                    isLoading={hackatons.is_fetching}
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
            <h3 className="font-medium">Fetch hackatons error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }
