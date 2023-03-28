import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { TDao, useUser } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { ToastError } from '../Toast'
import { Button } from '../Form'
import { FormikTextarea } from '../Formik'
import yup from '../../yup-extended'

type TDaoRequestMembershipModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

type TFormValues = {
    comment: string
}

const DaoRequestMembershipModal = (props: TDaoRequestMembershipModalProps) => {
    const { dao } = props
    const navigate = useNavigate()
    const resetModal = useResetRecoilState(appModalStateAtom)
    const { user } = useUser()

    const onSubmit = async (values: TFormValues) => {
        try {
            const { comment } = values
            await dao.adapter.createMember({
                members: [
                    {
                        user: { name: user.username!, type: 'user' },
                        allowance: 0,
                        comment,
                    },
                ],
            })

            resetModal()
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
            <div className="absolute right-2 top-2">
                <button className="px-3 py-2 text-gray-7c8db5" onClick={resetModal}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
            </div>
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                Request membership
            </Dialog.Title>

            <div>
                <Formik
                    initialValues={{ comment: '' }}
                    onSubmit={onSubmit}
                    validationSchema={yup.object().shape({
                        comment: yup.string().required(),
                    })}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div>
                                <Field
                                    name="comment"
                                    component={FormikTextarea}
                                    disabled={isSubmitting}
                                    placeholder="Write description of your request to DAO membership"
                                />
                            </div>
                            <div className="mt-4">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Create proposal
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </Dialog.Panel>
    )
}

export default DaoRequestMembershipModal
