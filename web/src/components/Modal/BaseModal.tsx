import { Dialog } from '@headlessui/react'
import { useRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'

const BaseModal = () => {
    const [modal, setModal] = useRecoilState(appModalStateAtom)

    return (
        <Dialog
            open={modal.isOpen}
            onClose={() =>
                !modal.static && setModal({ static: false, isOpen: false, element: null })
            }
            className="relative z-50"
        >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
                {modal.element}
            </div>
        </Dialog>
    )
}

export default BaseModal
