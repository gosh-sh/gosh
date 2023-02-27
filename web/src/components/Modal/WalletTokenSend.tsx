import { Dialog } from '@headlessui/react'
import { toast } from 'react-toastify'
import { IGoshDaoAdapter, IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'
import { TDao, TSmvDetails, useSmvTokenTransfer } from 'react-gosh'
import { Field, Form, Formik } from 'formik'
import { FormikInput } from '../Formik'
import yup from '../../yup-extended'
import { Button } from '../Form'
import ToastError from '../Error/ToastError'
import { useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { useCallback } from 'react'

type TWalletTokenSendModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    wallet: {
        adapter?: IGoshSmvAdapter
        details: TSmvDetails
    }
}

type TFormValues = {
    username: string
    amount: string
}

const WalletTokenSendModal = (props: TWalletTokenSendModalProps) => {
    const { dao, wallet } = props
    const resetModal = useResetRecoilState(appModalStateAtom)
    const { transferToInternal, transferToDaoReserve } = useSmvTokenTransfer(
        wallet.adapter,
        dao.adapter,
    )

    const getMaxAmount = useCallback(() => {
        const voting = wallet.details.smvAvailable - wallet.details.smvLocked
        return voting + wallet.details.smvBalance
    }, [wallet.details])

    const onSubmit = async (values: TFormValues) => {
        try {
            const username = values.username.trim()
            const amount = parseInt(values.amount)

            if (username.toLowerCase() === dao.details.name.toLowerCase()) {
                await transferToDaoReserve(amount)
            } else {
                await transferToInternal(username, amount)
            }

            toast.success('Tokens were sucessfuly sent')
            resetModal()
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
                Send tokens from wallet
            </Dialog.Title>

            <div>
                <Formik
                    initialValues={{
                        username: '',
                        amount: '',
                    }}
                    validationSchema={yup.object().shape({
                        username: yup.string().required(),
                        amount: yup
                            .number()
                            .integer()
                            .positive()
                            .max(getMaxAmount())
                            .required(),
                    })}
                    enableReinitialize
                    onSubmit={onSubmit}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div>
                                <Field
                                    name="username"
                                    component={FormikInput}
                                    disabled={isSubmitting}
                                    autoComplete="off"
                                    placeholder="GOSH username or DAO name"
                                    help="You can send tokens to DAO reserve by DAO name"
                                />
                            </div>
                            <div className="mt-6">
                                <Field
                                    name="amount"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Amount of tokens to send"
                                    disabled={isSubmitting}
                                    help={`Available ${getMaxAmount()}`}
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
            </div>
        </Dialog.Panel>
    )
}

export default WalletTokenSendModal
