import { Dialog } from '@headlessui/react'
import { toast } from 'react-toastify'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { ESmvEventType, TDao } from 'react-gosh'
import { Field, Form, Formik } from 'formik'
import { FormikCheckbox, FormikInput, FormikTextarea } from '../Formik'
import yup from '../../yup-extended'
import { Button } from '../Form'
import { useNavigate } from 'react-router-dom'
import { ToastError } from '../Toast'
import { useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

type TDaoTokenSendModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

type TFormValues = {
    username: string
    amount: string
    isVoting: boolean
    comment: string
}

const DaoTokenSendModal = (props: TDaoTokenSendModalProps) => {
    const { dao } = props
    const navigate = useNavigate()
    const resetModal = useResetRecoilState(appModalStateAtom)

    const onSubmit = async (values: TFormValues) => {
        try {
            const { isVoting, comment } = values
            const username = values.username.trim()
            const amount = parseInt(values.amount)
            const isMember = await dao.adapter.isMember({ username })

            if (isVoting) {
                if (isMember) {
                    await dao.adapter.addVotingTokens({ username, amount, comment })
                } else {
                    await dao.adapter.createMultiProposal({
                        proposals: [
                            {
                                type: ESmvEventType.DAO_MEMBER_ADD,
                                params: {
                                    members: [{ username, allowance: 0, comment: '' }],
                                },
                            },
                            {
                                type: ESmvEventType.DAO_TOKEN_VOTING_ADD,
                                params: { username, amount },
                            },
                        ],
                    })
                }
            } else {
                await dao.adapter.addRegularTokens({ username, amount, comment })
            }

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
                Send DAO tokens
            </Dialog.Title>

            <div>
                <Formik
                    initialValues={{
                        username: '',
                        amount: '',
                        isVoting: false,
                        comment: '',
                    }}
                    validationSchema={yup.object().shape({
                        username: yup.string().required(),
                        amount: yup
                            .number()
                            .integer()
                            .positive()
                            .max(dao.details.supply.reserve)
                            .required(),
                    })}
                    onSubmit={onSubmit}
                >
                    {({ isSubmitting, values }) => (
                        <Form>
                            <div>
                                <Field
                                    name="username"
                                    component={FormikInput}
                                    disabled={isSubmitting}
                                    autoComplete="off"
                                    placeholder="GOSH username"
                                />
                            </div>
                            <div className="mt-6">
                                <Field
                                    name="amount"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Amount of tokens to send"
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
                                />
                            </div>
                            <div className="mt-4">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Create proposal to send tokens
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </Dialog.Panel>
    )
}

export default DaoTokenSendModal
