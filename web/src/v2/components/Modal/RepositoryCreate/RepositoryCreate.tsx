import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import yup from '../../../yup-extended'
import { FormikInput } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useRepositoryCreate } from '../../../hooks/repository.hooks'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'

type TFormValues = {
    name: string
}

const RepositoryCreateModal = () => {
    const setModal = useSetRecoilState(appModalStateAtom)
    const { create: createRepository } = useRepositoryCreate()

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onRepositoryCreate = async (values: TFormValues) => {
        try {
            await createRepository(values.name)
            onModalReset()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
            <div className="absolute right-2 top-2">
                <button className="px-3 py-2 text-gray-7c8db5" onClick={onModalReset}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
            </div>
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                Create new repository
            </Dialog.Title>

            <div>
                <Formik
                    initialValues={{ name: '' }}
                    onSubmit={onRepositoryCreate}
                    validationSchema={yup.object().shape({
                        name: yup.string().reponame().required('Name is required'),
                    })}
                >
                    {({ isSubmitting, setFieldValue }) => (
                        <Form>
                            <div className="mb-6">
                                <Field
                                    name="name"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Repository name"
                                    disabled={isSubmitting}
                                    onChange={(e: any) =>
                                        setFieldValue(
                                            'name',
                                            e.target.value.toLowerCase(),
                                        )
                                    }
                                    test-id="input-repo-name"
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
            </div>
        </Dialog.Panel>
    )
}

export { RepositoryCreateModal }
