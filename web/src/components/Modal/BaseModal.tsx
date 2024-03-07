import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'

type TBaseModalCleanProps = {
  is_open: boolean
  is_static?: boolean
  element: any
  onClose?(): void
}

export const BaseModalClean = (props: TBaseModalCleanProps) => {
  const { is_open, is_static, element } = props

  const onCloseDefault = () => {}
  const onClose = props.onClose || onCloseDefault

  return (
    <Transition show={is_open} as={Fragment}>
      <Dialog onClose={onClose} static={is_static} className="fixed inset-0 z-50">
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
            {element}
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}

const BaseModal = () => {
  const [modal, setModal] = useRecoilState(appModalStateAtom)
  const resetModal = useResetRecoilState(appModalStateAtom)

  const onClose = () => {
    if (!modal.static) {
      setModal((state) => ({ ...state, isOpen: false }))
      setTimeout(resetModal, 300)
    }
  }

  return (
    <BaseModalClean
      is_open={modal.isOpen}
      is_static={modal.static}
      element={modal.element}
      onClose={onClose}
    />
  )
}

export default BaseModal
