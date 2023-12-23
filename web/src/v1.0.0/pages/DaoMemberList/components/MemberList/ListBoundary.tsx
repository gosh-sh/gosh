import Alert from '../../../../../components/Alert'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import classNames from 'classnames'
import { useEffect } from 'react'
import { ListItem, ListItemHeader, ListItemSkeleton } from './ListItem'
import { useDaoMemberList } from '../../../../hooks/dao.hooks'
import { Button } from '../../../../../components/Form'

type TListBoundaryInnerProps = React.HTMLAttributes<HTMLDivElement> & {
  search: string
}

const ListBoundaryInner = (props: TListBoundaryInnerProps) => {
  const { className, search } = props
  const members = useDaoMemberList({ search })
  const { showBoundary } = useErrorBoundary()

  useEffect(() => {
    if (members.error) {
      showBoundary(members.error)
    }
  }, [members.error])

  return (
    <div className={classNames('border rounded-xl px-1 py-2 overflow-hidden', className)}>
      {members.isFetching && !members.items.length && <ListItemSkeleton />}

      {!!members.items.length && (
        <div className="divide-y divide-gray-e6edff">
          <ListItemHeader />
          {members.items.map((item, index) => (
            <ListItem key={index} item={item} />
          ))}
        </div>
      )}

      {members.hasNext && (
        <div className="text-center mt-8">
          <Button
            type="button"
            className="w-full md:w-auto"
            disabled={members.isFetching}
            isLoading={members.isFetching}
            onClick={members.getNext}
            test-id="btn-daomembers-more"
          >
            Load more
          </Button>
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
