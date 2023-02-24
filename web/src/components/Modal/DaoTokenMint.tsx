import { Dialog } from '@headlessui/react'
import { toast } from 'react-toastify'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { TDao } from 'react-gosh'
import { Field, Form, Formik } from 'formik'
import { FormikInput, FormikTextarea } from '../Formik'
import yup from '../../yup-extended'
import { Button } from '../Form'
import { useNavigate } from 'react-router-dom'
import ToastError from '../Error/ToastError'
import { useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

type TDaoTokenMintModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

type TFormValues = {
    amount: string
    comment: string
}

const DaoTokenMintModal = (props: TDaoTokenMintModalProps) => {
    const { dao } = props
    const navigate = useNavigate()
    const resetModal = useResetRecoilState(appModalStateAtom)

    const onSubmit = async (values: TFormValues) => {
        try {
            const { comment } = values
            const amount = parseInt(values.amount)
            await dao.adapter.mint({ amount, comment })

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
                Mint tokens
            </Dialog.Title>

            <div>
                <Formik
                    initialValues={{
                        amount: '',
                        comment: '',
                    }}
                    validationSchema={yup.object().shape({
                        amount: yup.number().integer().positive().required(),
                    })}
                    onSubmit={onSubmit}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div className="mt-6">
                                <Field
                                    name="amount"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Amount of tokens to mint"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <hr className="mt-8 mb-6 bg-gray-e6edff" />
                            <div>
                                <Field
                                    name="comment"
                                    component={FormikTextarea}
                                    disabled={isSubmitting}
                                    placeholder="Write a description so that the DAO members can understand it"
                                />
                            </div>
                            <div className="mt-4">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Create proposal to mint tokens
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </Dialog.Panel>
    )
}

export default DaoTokenMintModal
