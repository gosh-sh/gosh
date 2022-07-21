import { Dialog } from '@headlessui/react';
import { useRecoilState } from 'recoil';
import { appModalStateAtom } from '../../store/app.state';

const BaseModal = () => {
    const [modal, setModal] = useRecoilState(appModalStateAtom);

    return (
        <Dialog
            open={modal.isOpen}
            onClose={() =>
                !modal.static && setModal({ static: false, isOpen: false, element: null })
            }
        >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                {modal.element}
            </div>
        </Dialog>
    );
};

export default BaseModal;
