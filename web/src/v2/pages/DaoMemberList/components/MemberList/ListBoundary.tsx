import Alert from '../../../../../components/Alert'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import classNames from 'classnames'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { daoMemberListSelector } from '../../../../store/dao.state'
import { ListItem, ListItemSkeleton } from './ListItem'

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
                'border rounded-xl px-1 py-2 overflow-x-auto',
                className,
            )}
        >
            <table className="w-full">
                <thead>
                    <tr className="text-gray-7c8db5 text-left text-xs">
                        <th className="font-normal px-3 py-2 w-4/12">name</th>
                        <th className="font-normal px-3 py-2">balance</th>
                        <th className="font-normal px-3 py-2 w-3/12">profile</th>
                        <th className="font-normal px-3 py-2 w-3/12">wallet</th>
                        <th className="font-normal px-3 py-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {memberList.isFetching && !memberList.items.length && (
                        <ListItemSkeleton />
                    )}

                    {memberList.items.map((item, index) => (
                        <ListItem key={index} item={item} />
                    ))}
                </tbody>
            </table>
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
