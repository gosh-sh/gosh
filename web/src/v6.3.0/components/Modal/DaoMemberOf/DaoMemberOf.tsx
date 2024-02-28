import { Dialog } from '@headlessui/react'
import { useResetRecoilState } from 'recoil'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import Alert from '../../../../components/Alert'
import { appModalStateAtom } from '../../../../store/app.state'

const DaoMemberOfModal = () => {
  const resetModal = useResetRecoilState(appModalStateAtom)

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-2xl">
      <div className="absolute right-2 top-2">
        <button className="px-3 py-2 text-gray-7c8db5" onClick={resetModal}>
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
      </div>
      <Dialog.Title className="mb-8 text-3xl text-center font-medium">
        Wallet's Owner
      </Dialog.Title>

      <Alert variant="warning">Will be available soon</Alert>
    </Dialog.Panel>
  )
}

export { DaoMemberOfModal }
