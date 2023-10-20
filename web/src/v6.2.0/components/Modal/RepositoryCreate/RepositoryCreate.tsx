import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import yup from '../../../yup-extended'
import { FormikInput, FormikTextarea } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useCreateRepository } from '../../../hooks/repository.hooks'
import { useNavigate } from 'react-router-dom'
import { useDao } from '../../../hooks/dao.hooks'
import { ModalCloseButton } from '../../../../components/Modal'

type TFormValues = {
    name: string
    description?: string
}

const RepositoryCreateModal = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const { createRepository } = useCreateRepository()

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onRepositoryCreate = async (values: TFormValues) => {
        const { name, description } = values
        try {
            const { eventaddr } = await createRepository(name, description)
            onModalReset()
            if (eventaddr) {
                navigate(`/o/${dao.details.name}/events/${eventaddr}`)
            }
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
            <Formik
                initialValues={{ name: '' }}
                onSubmit={onRepositoryCreate}
                validationSchema={yup.object().shape({
                    name: yup.string().reponame().required('Name is required'),
                })}
            >
                {({ isSubmitting, setFieldValue }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />
                        <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                            Create new repository
                        </Dialog.Title>
                        <div className="mb-6">
                            <Field
                                name="name"
                                component={FormikInput}
                                autoComplete="off"
                                placeholder="Repository name"
                                disabled={isSubmitting}
                                onChange={(e: any) =>
                                    setFieldValue('name', e.target.value.toLowerCase())
                                }
                                test-id="input-repo-name"
                            />
                        </div>

                        <div className="mb-6">
                            <Field
                                name="description"
                                component={FormikTextarea}
                                autoComplete="off"
                                placeholder="Repository description (optional)"
                                disabled={isSubmitting}
                                maxRows={6}
                                test-id="input-repo-description"
                            />
                        </div>

                        <div>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                                className="w-full"
                                test-id="btn-repo-create"
                            >
                                Create repository
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

export { RepositoryCreateModal }
