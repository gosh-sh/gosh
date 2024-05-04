import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useDaoIsMemberOfList } from '../../../hooks/dao.hooks'
import { ListBoundary } from './ListBoundary'

const DaoMemberOfModal = () => {
  const setModal = useSetRecoilState(appModalStateAtom)
  const isMemberOfData = useDaoIsMemberOfList({ initialize: true })

  const closeModal = () => {
    setModal((state) => ({ ...state, isOpen: false }))
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
        <ListBoundary data={isMemberOfData} closeModal={closeModal} />
      </div>
    </Dialog.Panel>
  )
}

export { DaoMemberOfModal }
