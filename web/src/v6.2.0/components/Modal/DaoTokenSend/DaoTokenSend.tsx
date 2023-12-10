import { Dialog } from '@headlessui/react'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { Button } from '../../../../components/Form'
import yup from '../../../yup-extended'
import { useDao, useSendDaoTokens } from '../../../hooks/dao.hooks'
import {
    BaseField,
    FormikCheckbox,
    FormikInput,
    FormikTextarea,
} from '../../../../components/Formik'
import { UserSelect } from '../../UserSelect'
import { ModalCloseButton } from '../../../../components/Modal'

type TFormValues = {
    username: string
    usertype: string
    amount: string
    isVoting: boolean
    comment: string
}

const DaoTokenSendModal = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const { send } = useSendDaoTokens()

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onSubmit = async (values: TFormValues) => {
        try {
            const { isVoting, comment, username, usertype } = values
            const amount = parseInt(values.amount)
            const { eventaddr } = await send({
                username,
                usertype,
                amount,
                isVoting,
                comment,
            })
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
                initialValues={{
                    username: '',
                    usertype: '',
                    amount: '',
                    isVoting: false,
                    comment: '',
                }}
                validationSchema={yup.object().shape({
                    username: yup.string().required(),
                    usertype: yup.string().required(),
                    amount: yup
                        .number()
                        .integer()
                        .positive()
                        .max(dao.details.supply?.reserve || 0)
                        .required(),
                    comment: yup.string().required(),
                })}
                onSubmit={onSubmit}
                enableReinitialize
            >
                {({ isSubmitting, values, setFieldValue }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />
                        <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                            Send DAO tokens
                        </Dialog.Title>

                        <div>
                            <Field name="username" component={BaseField}>
                                <UserSelect
                                    placeholder="Username or DAO name"
                                    isDisabled={isSubmitting}
                                    searchDao
                                    onChange={(option) => {
                                        const name = option?.value.name || ''
                                        const type = option?.value.type || ''
                                        setFieldValue('username', name, true)
                                        setFieldValue('usertype', type, true)
                                    }}
                                />
                            </Field>
                        </div>
                        <div className="mt-6">
                            <Field
                                name="amount"
                                component={FormikInput}
                                autoComplete="off"
                                placeholder="Amount of tokens to send"
                                help={`Available DAO reserve ${dao.details.supply?.reserve.toLocaleString()}`}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="mt-6">
                            <Field
                                name="isVoting"
                                component={FormikCheckbox}
                                disabled={isSubmitting}
                                inputProps={{
                                    label: `Increase member Voting allowance by ${
                                        parseInt(values.amount) || ''
                                    }`,
                                }}
                            />
                        </div>
                        <hr className="mt-8 mb-6 bg-gray-e6edff" />
                        <div>
                            <Field
                                name="comment"
                                component={FormikTextarea}
                                disabled={isSubmitting}
                                placeholder="Write a description of the transfer here so that the DAO members can understand it"
                                maxRows={5}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Send tokens
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

export { DaoTokenSendModal }
