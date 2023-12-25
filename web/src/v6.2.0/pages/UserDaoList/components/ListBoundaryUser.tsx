import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../../components/Alert'
import { useUserDaoList } from '../../../hooks/dao.hooks'
import { ListItem, ListItemSkeleton } from './ListItem'
import { Button } from '../../../../components/Form'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { useEffect } from 'react'

const ListBoundaryInner = () => {
  const userDaoList = useUserDaoList({ count: 6, initialize: true })
  const { showBoundary } = useErrorBoundary()

  const onGetNext = async () => {
    try {
      await userDaoList.getNext()
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    if (userDaoList.error) {
      showBoundary(userDaoList.error)
    }
  }, [userDaoList.error])

  return (
    <div>
      {userDaoList.isEmpty && (
        <div className="text-sm text-gray-7c8db5 text-center">
          There are no organizations
        </div>
      )}

      <div className="row">
        {userDaoList.isFetching && !userDaoList.items.length && (
          <div className="col-n">
            <ListItemSkeleton />
          </div>
        )}

        {userDaoList.items.map((item, index) => (
          <div key={index} className="col-n">
            <ListItem className="h-full" item={item} />
          </div>
        ))}
      </div>

      {userDaoList.hasNext && (
        <div className="text-center mt-8">
          <Button
            type="button"
            size="xl"
            className="w-full md:w-auto"
            disabled={userDaoList.isFetching}
            isLoading={userDaoList.isFetching}
            onClick={onGetNext}
            test-id="btn-dao-more"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}

const ListBoundaryUser = withErrorBoundary(ListBoundaryInner, {
  fallbackRender: ({ error }) => (
    <Alert variant="danger">
      <h3 className="font-medium">Fetch DAO list error</h3>
      <div>{error.message}</div>
    </Alert>
  ),
})

export { ListBoundaryUser }
