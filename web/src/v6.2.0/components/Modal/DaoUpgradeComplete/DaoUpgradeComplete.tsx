import { Dialog } from '@headlessui/react'
import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useDao, useUpgradeDaoComplete } from '../../../hooks/dao.hooks'
import { ModalCloseButton } from '../../../../components/Modal'
import { useNavigate } from 'react-router-dom'

const DaoUpgradeCompleteModal = () => {
    const setModal = useSetRecoilState(appModalStateAtom)
    const navigate = useNavigate()
    const dao = useDao()
    const { upgrade } = useUpgradeDaoComplete()

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onCompleteUpgrade = async () => {
        try {
            const { isEvent } = await upgrade()
            onModalReset()
            if (isEvent) {
                navigate(`/o/${dao.details.name}/events`)
            }
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
        </Dialog.Panel>
    )
}

export { DaoUpgradeCompleteModal }
