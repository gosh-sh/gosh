import { useRecoilValue } from 'recoil'
import { useDaoRepositoryList } from '../../../hooks/repository.hooks'
import { daoRepositoryListSelector } from '../../../store/repository.state'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { ListItem, ListItemSkeleton } from './ListItem'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { Button } from '../../../../components/Form'
import classNames from 'classnames'
import { useEffect } from 'react'
import Alert from '../../../../components/Alert'
import { useDao } from '../../../hooks/dao.hooks'

const ListBoundaryInner = (props: { count: number }) => {
    const { count } = props
    const dao = useDao()
    const { getNext } = useDaoRepositoryList({ count })
    const repositoryList = useRecoilValue(daoRepositoryListSelector)
    const { showBoundary } = useErrorBoundary()

    const onGetNext = async () => {
        try {
            await getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (repositoryList.error) {
            showBoundary(repositoryList.error)
        }
    }, [repositoryList.error])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            {repositoryList.isFetching && !repositoryList.items.length && (
                <ListItemSkeleton />
            )}

            {repositoryList.isEmpty && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    There are no repositories
                </div>
            )}

            <div className="divide-y divide-gray-e6edff">
                {repositoryList.items.map((item, index) => (
                    <ListItem key={index} daoName={dao.details.name!} item={item} />
                ))}
            </div>

            {repositoryList.hasNext && (
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={repositoryList.isFetching}
                    isLoading={repositoryList.isFetching}
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
