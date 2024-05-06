import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Menu, Transition } from '@headlessui/react'
import classNames from 'classnames'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fragment } from 'react/jsx-runtime'
import { Button, ButtonLink } from '../../../../components/Form'
import {
  useDao,
  useDaoIsMemberOfList,
  useTransferTokensAsDao,
} from '../../../hooks/dao.hooks'
import { TDaoIsMemberOfListItem } from '../../../types/dao.types'

type TListItemProps = {
  item: TDaoIsMemberOfListItem
  openSubModal(item: TDaoIsMemberOfListItem): void
  closeModal(): void
}

const ListItem = (props: TListItemProps) => {
  const { item, openSubModal, closeModal } = props
  const navigate = useNavigate()
  const dao = useDao()
  const { updateList } = useDaoIsMemberOfList()
  const { transferTokens } = useTransferTokensAsDao()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const transferTokensAsDao = async (item: TDaoIsMemberOfListItem) => {
    try {
      setIsSubmitting(true)
      const { eventaddr } = await transferTokens({
        src_dao: {
          name: item.name,
          wallet: item.wallet.address,
          version: item.version,
        },
        amount: item.balance,
      })

      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
        closeModal()
      } else {
        await updateList()
      }
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <tr
      className="text-xs border-b border-dashed block md:table-row py-1 md:py-0
        [&_td]:py-1.5 [&_td]:text-gray-600 [&_td]:grid [&_td]:grid-cols-[16ch,_auto] md:[&_td]:table-cell
        [&_td]:before:content-[attr(data-cell)] [&_td]:before:font-light md:[&_td]:before:hidden"
    >
      <td data-cell="DAO name">
        {item.name}{' '}
        <span className="text-gray-400 text-[0.65rem]">v{item.version}</span>
      </td>
      <td data-cell="Karma">{item.karma.toLocaleString()}</td>
      <td data-cell="Balance">
        {item.balance.toLocaleString()}
        {item.version !== dao.details.version && (
          <span className="ml-1 text-yellow-500 text-[0.65rem]">
            Untransferred
          </span>
        )}
      </td>
      <td>
        <Menu as="div" className="relative text-end">
          <Menu.Button
            as={Button}
            variant="custom"
            isLoading={isSubmitting}
            className="inline-flex flex-nowrap items-center text-gray-53596d !text-xs !px-0 !py-1"
          >
            {({ open }) => (
              <>
                <span>Actions</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  size="sm"
                  className={classNames(
                    'ml-2 transition-all',
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
            <Menu.Items
              className="absolute origin-top-right right-0 bg-white border border-gray-e6edff
                rounded-lg mt-2 z-50 min-w-32 shadow overflow-clip"
            >
              {item.version !== dao.details.version ? (
                <Menu.Item
                  as={Button}
                  disabled={!item.has_current || isSubmitting}
                  isLoading={isSubmitting}
                  variant="custom"
                  className={classNames(
                    'flex items-center w-full !rounded-none !text-sm !py-1.5 text-start hover:!bg-gray-fafafd',
                    'hover:!text-black transition-colors duration-200 disabled:opacity-50',
                    !item.has_current ? 'pointer-events-none' : null,
                    isSubmitting ? 'pointer-events-none opacity-50' : null,
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    transferTokensAsDao(item)
                  }}
                >
                  <div>
                    <span
                      className={classNames(
                        !item.has_current ? 'opacity-50' : 'opacity-100',
                      )}
                    >
                      Transfer to current version
                    </span>
                    {!item.has_current && (
                      <p className="text-yellow-500 text-[0.7rem]">
                        DAO {item.name} should be upgraded to{' '}
                        {dao.details.version}
                      </p>
                    )}
                  </div>
                </Menu.Item>
              ) : (
                <>
                  <Menu.Item
                    as={Button}
                    variant="custom"
                    className="w-full !rounded-none !text-sm !py-1.5 text-start hover:!bg-gray-fafafd
                    hover:!text-black transition-colors duration-200"
                    onClick={() => openSubModal(item)}
                  >
                    Send tokens
                  </Menu.Item>
                  <Menu.Item
                    as={ButtonLink}
                    to={`/o/${item.name}/tasks`}
                    variant="custom"
                    className="block w-full !rounded-none !text-sm !py-1.5 text-start hover:!bg-gray-fafafd
                    hover:!text-black transition-colors duration-200"
                    onClick={closeModal}
                  >
                    Receive task rewards
                  </Menu.Item>
                </>
              )}
            </Menu.Items>
          </Transition>
        </Menu>
      </td>
    </tr>
  )
}

export { ListItem }
