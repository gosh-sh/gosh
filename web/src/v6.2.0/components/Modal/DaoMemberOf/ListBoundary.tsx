import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../../components/Alert'
import Loader from '../../../../components/Loader'
import BaseModal from '../../../../components/Modal/BaseModal'
import {
  TDaoIsMemberOfList,
  TDaoIsMemberOfListItem,
} from '../../../types/dao.types'
import { SendExternalDaoTokens } from '../../SendExternalDaoTokens'
import { ListItem } from './ListItem'

const ListBoundaryInner = (props: {
  data: TDaoIsMemberOfList
  closeModal(): void
}) => {
  const { data, closeModal } = props
  const { showBoundary } = useErrorBoundary()
  const [subModal, setSubModal] = useState<{
    static?: boolean
    isOpen: boolean
    element: React.ReactElement | null
  }>({ isOpen: false, element: null })

  const openSubModal = (item: TDaoIsMemberOfListItem) => {
    setSubModal((state) => ({
      ...state,
      element: (
        <SendExternalDaoTokens
          item={item}
          close={closeSubModal}
          onSuccess={closeModal}
        />
      ),
      isOpen: true,
    }))
  }

  const closeSubModal = () => {
    setSubModal((state) => ({
      ...state,
      isOpen: false,
    }))
  }

  useEffect(() => {
    if (!data.is_fetching && data.error) {
      showBoundary(data.error)
    }
  }, [data.is_fetching, data.error])

  return (
    <>
      <div
        className={classNames(
          'text-end',
          data.is_fetching ? 'visible' : 'invisible',
        )}
      >
        <Loader className="text-xs">Updating...</Loader>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-xs text-gray-400 text-left border-b [&_th]:font-light [&_th]:py-1.5 hidden md:table-row">
            <th>DAO name</th>
            <th>Karma</th>
            <th>Balance</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {data.is_fetching && !data.items.length && (
            <tr>
              <td colSpan={4} className="py-1.5">
                <Loader className="py-2 text-xs">Loading data...</Loader>
              </td>
            </tr>
          )}
          {!data.is_fetching && !data.items.length && (
            <tr>
              <td colSpan={4} className="py-1.5 text-xs text-gray-400">
                Nothing was found
              </td>
            </tr>
          )}
          {data.error && (
            <tr>
              <td colSpan={4} className="py-1.5 text-xs text-gray-400">
                <Alert variant="danger">{data.error.message}</Alert>
              </td>
            </tr>
          )}

          {data.items.map((item, index) => (
            <ListItem
              key={index}
              item={item}
              openSubModal={openSubModal}
              closeModal={closeModal}
            />
          ))}
        </tbody>
      </table>

      <BaseModal modal={subModal} resetModal={closeSubModal} />
    </>
  )
}

const ListBoundary = withErrorBoundary(ListBoundaryInner, {
  fallbackRender: ({ error }) => (
    <Alert variant="danger">
      <h3 className="font-medium">Fetch tokens error</h3>
      <div>{error.message}</div>
    </Alert>
  ),
})

export { ListBoundary }
