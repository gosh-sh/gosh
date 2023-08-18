import { Dialog } from '@headlessui/react'
import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useUpgradeDaoComplete } from '../../../hooks/dao.hooks'
import { ToastStatus } from '../../../../components/Toast'
import { ModalCloseButton } from '../../../../components/Modal'

const DaoUpgradeCompleteModal = () => {
    const setModal = useSetRecoilState(appModalStateAtom)
    const { upgrade, status } = useUpgradeDaoComplete()

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onCompleteUpgrade = async () => {
        try {
            await upgrade()
            onModalReset()
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-lg">
            <Formik initialValues={{}} onSubmit={onCompleteUpgrade}>
                {({ isSubmitting }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />
                        <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                            Complete DAO upgrade
                        </Dialog.Title>

                        <div>
                            <div className="text-center">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                    test-id="btn-dao-upgrade-complete"
                                >
                                    Start upgrade complete process
                                </Button>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>

            <ToastStatus status={status} />
        </Dialog.Panel>
    )
}

export { DaoUpgradeCompleteModal }
