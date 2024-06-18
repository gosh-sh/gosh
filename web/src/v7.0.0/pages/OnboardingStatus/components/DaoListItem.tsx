import emptylogo from '../../../../assets/images/emptylogo.svg'
import { Transition } from '@headlessui/react'
import Spinner from '../../../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronUp,
  faExclamationTriangle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons'
import classNames from 'classnames'
import { Input } from '../../../../components/Form'
import { PropsWithChildren } from 'react'
import { TOnboardingStatusDao } from '../../../types/onboarding.types'

type TDaoListItemProps = PropsWithChildren & {
  item: TOnboardingStatusDao
  index: number
  onDaoToggle(name: string): void
  onDaoNameChange(index: number, value: string): Promise<void>
}

const DaoListItem = (props: TDaoListItemProps) => {
  const { item, index, onDaoToggle, onDaoNameChange, children } = props

  const isNameValid = !item.validated || item.validated.valid === true
  const isReposValid = item.repos.every(
    (repo) => !repo.validated || repo.validated.valid === true,
  )

  return (
    <div className="border rounded-xl overflow-hidden">
      <div
        className="flex flex-nowrap p-5 cursor-pointer hover:bg-gray-fafafd"
        onClick={() => {
          onDaoToggle(item.name)
        }}
      >
        <div className="w-16 shrink-0">
          <img src={emptylogo} className="w-full rounded-xl" alt="" />
        </div>
        <div className="grow pl-4 overflow-hidden">
          <div className="relative mb-1">
            <div
              className={classNames(
                'text-xl font-medium leading-tight whitespace-nowrap text-ellipsis overflow-hidden max-w-[80%]',
                item.validated?.valid === false ? '!text-red-ff3b30' : null,
              )}
            >
              {item.name}
            </div>
            <div className="absolute right-1 top-0 text-base text-gray-7c8db5">
              <FontAwesomeIcon
                icon={faChevronUp}
                className={classNames(
                  'transition-transform',
                  item.isOpen ? 'rotate-180' : null,
                )}
              />
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-53596d">
            {item.progress.uploaded !== item.progress.total && (
              <Spinner className="mr-2" />
            )}
            Uploaded ({item.progress.uploaded} / {item.progress.total} repos)
          </p>
          {(!isNameValid || !isReposValid) && (
            <div className="flex text-gray-53596d text-xs mt-3">
              <div className="grow text-rose-600">
                {!isNameValid && <p>{item.validated?.reason}</p>}
                {!isReposValid && <p>Problems with repository names</p>}
              </div>
              <div className="text-rose-600">
                <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
              </div>
            </div>
          )}
        </div>
      </div>

      <Transition
        show={item.isOpen}
        enter="transition-transform origin-top duration-200"
        enterFrom="scale-y-0"
        enterTo="scale-y-100"
        leave="transition-transform origin-top duration-200"
        leaveFrom="scale-y-100"
        leaveTo="scale-y-0"
      >
        <div>
          {item.shouldUpdate && (
            <div className="p-5">
              <Input
                type="text"
                placeholder="Provide another DAO name"
                value={item.name}
                hasError={!!item.validated?.reason}
                after={
                  <FontAwesomeIcon
                    icon={!isNameValid ? faTriangleExclamation : faCircleCheck}
                    size="lg"
                    className={classNames(
                      'py-1.5 px-2 text-green-34c759',
                      !isNameValid ? '!text-red-dd3a3a' : null,
                    )}
                  />
                }
                onChange={(e) => {
                  onDaoNameChange(index, e.target.value)
                }}
              />
              {item.validated?.reason && (
                <div className="text-red-dd3a3a text-xs">{item.validated.reason}</div>
              )}
            </div>
          )}
          {children}
        </div>
      </Transition>
    </div>
  )
}

export default DaoListItem
