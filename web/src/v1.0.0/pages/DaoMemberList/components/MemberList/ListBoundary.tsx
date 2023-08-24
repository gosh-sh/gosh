import Alert from '../../../../../components/Alert'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import classNames from 'classnames'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { daoMemberListSelector } from '../../../../store/dao.state'
import { ListItem, ListItemHeader, ListItemSkeleton } from './ListItem'

type TListBoundaryInnerProps = React.HTMLAttributes<HTMLDivElement> & {
    search: string
}

const ListBoundaryInner = (props: TListBoundaryInnerProps) => {
    const { className, search } = props
    const memberList = useRecoilValue(daoMemberListSelector(search))
    const { showBoundary } = useErrorBoundary()

    useEffect(() => {
        if (memberList.error) {
            showBoundary(memberList.error)
        }
    }, [memberList.error])

    return (
        <div
            className={classNames(
                'border rounded-xl px-1 py-2 overflow-hidden',
                className,
            )}
        >
            {memberList.isFetching && !memberList.items.length && <ListItemSkeleton />}

            {!!memberList.items.length && (
                <div className="divide-y divide-gray-e6edff">
                    <ListItemHeader />
                    {memberList.items.map((item, index) => (
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
            <h3 className="font-medium">Fetch DAO members error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }
