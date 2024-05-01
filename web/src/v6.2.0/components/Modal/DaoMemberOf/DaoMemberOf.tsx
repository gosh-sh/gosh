import { faChevronDown, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog, Menu, Transition } from '@headlessui/react'
import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { Fragment } from 'react/jsx-runtime'
import { useSetRecoilState } from 'recoil'
import Alert from '../../../../components/Alert'
import { Button } from '../../../../components/Form'
import Loader from '../../../../components/Loader'
import BaseModal from '../../../../components/Modal/BaseModal'
import { appModalStateAtom } from '../../../../store/app.state'
import { useDaoIsMemberOfList } from '../../../hooks/dao.hooks'
import {
  TDaoIsMemberOfList,
  TDaoIsMemberOfListItem,
} from '../../../types/dao.types'
import { SendExternalDaoTokens } from '../../SendExternalDaoTokens'

const DaoMemberOfModalBoundary = withErrorBoundary(
  (props: {
    data: TDaoIsMemberOfList
    openSubModal(item: TDaoIsMemberOfListItem): void
  }) => {
    const { data, openSubModal } = props
    const { showBoundary } = useErrorBoundary()

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
              <tr
                key={index}
                className="text-xs border-b border-dashed block md:table-row py-1 md:py-0
                [&_td]:py-1.5 [&_td]:text-gray-600 [&_td]:grid [&_td]:grid-cols-[16ch,_auto] md:[&_td]:table-cell
                [&_td]:before:content-[attr(data-cell)] [&_td]:before:font-light md:[&_td]:before:hidden"
              >
                <td data-cell="DAO name">{item.dao_name}</td>
                <td data-cell="Karma">{item.karma.toLocaleString()}</td>
                <td data-cell="Balance">{item.balance.toLocaleString()}</td>
                <td>
                  <Menu as="div" className="relative text-end">
                    <Menu.Button className="inline-flex flex-nowrap items-center text-gray-53596d gap-2">
                      {({ open }) => (
                        <>
                          <span>Manage</span>
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            size="sm"
                            className={classNames(
                              'transition-all',
                              open ? 'rotate-180' : null,
                            )}
                          />
                        </>
                      )}
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute origin-top-right right-0 bg-white border border-gray-e6edff rounded-lg mt-2 z-50 min-w-32 shadow overflow-clip">
                        <Menu.Item as="div">
                          <Button
                            variant="custom"
                            className="w-full !rounded-none !text-sm !py-1.5 text-start hover:!bg-gray-fafafd hover:!text-black transition-colors duration-200"
                            onClick={() => openSubModal(item)}
                          >
                            Send
                          </Button>
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  },
  {
    fallbackRender: ({ error }) => (
      <Alert variant="danger">
        <h3 className="font-medium">Fetch tokens error</h3>
        <div>{error.message}</div>
      </Alert>
    ),
  },
)

const DaoMemberOfModal = () => {
  const setModal = useSetRecoilState(appModalStateAtom)
  const isMemberOfData = useDaoIsMemberOfList({ initialize: true })
  const [subModal, setSubModal] = useState<{
    static?: boolean
    isOpen: boolean
    element: React.ReactElement | null
  }>({ isOpen: false, element: null })

  const closeModal = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

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

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-xl">
      <div className="absolute right-2 top-2">
        <button className="px-3 py-2 text-gray-7c8db5" onClick={closeModal}>
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
      </div>
      <Dialog.Title className="mb-6 text-3xl text-center font-medium">
        Wallet's Owner
      </Dialog.Title>

      <div>
        <DaoMemberOfModalBoundary
          data={isMemberOfData}
          openSubModal={openSubModal}
        />
      </div>

      <BaseModal modal={subModal} resetModal={closeSubModal} />
    </Dialog.Panel>
  )
}

export { DaoMemberOfModal }
