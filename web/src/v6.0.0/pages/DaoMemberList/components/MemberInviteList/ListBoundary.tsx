import Alert from '../../../../../components/Alert'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { useEffect } from 'react'
import { ListItem, ListItemHeader, ListItemSkeleton } from './ListItem'
import { useDaoInviteList } from '../../../../hooks/dao.hooks'
import classNames from 'classnames'

const ListBoundaryInner = (props: React.HTMLAttributes<HTMLDivElement>) => {
    const { className } = props
    const inviteList = useDaoInviteList()
    const { showBoundary } = useErrorBoundary()

    useEffect(() => {
        if (inviteList.error) {
            showBoundary(inviteList.error)
        }
    }, [inviteList.error])

    return (
        <div className={classNames('p-5', className)}>
            {inviteList.isFetching && !inviteList.items.length && <ListItemSkeleton />}

            {inviteList.isEmpty && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    There are no invites
                </div>
            )}

            {!!inviteList.items.length && (
                <div className="divide-y divide-gray-e6edff">
                    <ListItemHeader />
                    {inviteList.items.map((item, index) => (
                        <ListItem key={index} item={item} />
                    ))}
                </div>
            )}
        </div>
    )
}

const ListBoundary = withErrorBoundary(ListBoundaryInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch member invites error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }
