import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'

const BaseModal = () => {
  const modal = useRecoilValue(appModalStateAtom)
  const resetModal = useResetRecoilState(appModalStateAtom)

  return (
    <Transition show={modal.isOpen} as={Fragment}>
      <Dialog
        onClose={() => !modal.static && resetModal()}
        className="fixed inset-0 z-50"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
            {modal.element}
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}

export default BaseModal
