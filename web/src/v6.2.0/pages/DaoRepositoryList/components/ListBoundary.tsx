import classNames from 'classnames'
import { useEffect } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { toast } from 'react-toastify'
import Alert from '../../../../components/Alert'
import { Button } from '../../../../components/Form'
import { ToastError } from '../../../../components/Toast'
import { useDao } from '../../../hooks/dao.hooks'
import { useDaoRepositoryList } from '../../../hooks/repository.hooks'
import { ListItem, ListItemSkeleton } from './ListItem'

const ListBoundaryInner = (props: { count: number }) => {
    const { count } = props
    const dao = useDao()
    const repositories = useDaoRepositoryList({ initialize: true, count })
    const { showBoundary } = useErrorBoundary()

    const onGetNext = async () => {
        try {
            await repositories.getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (repositories.error) {
            showBoundary(repositories.error)
        }
    }, [repositories.error])

    return (
        <div>
            {repositories.isFetching && !repositories.items.length && (
                <ListItemSkeleton />
            )}

            {repositories.isEmpty && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    <p>There are no repositories</p>
                    <p className="text-xs">
                        If DAO was recently upgraded, check DAO events for transferring
                        repositories
                    </p>
                </div>
            )}

            <div className="grid grid-flow-col auto-cols-min gap-7">
                {repositories.items.map((item, index) => (
                    <ListItem key={index} dao_name={dao.details.name!} item={item} />
                ))}
            </div>

            {repositories.hasNext && (
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={repositories.isFetching}
                    isLoading={repositories.isFetching}
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
            <h3 className="font-medium">Fetch repositories error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }
