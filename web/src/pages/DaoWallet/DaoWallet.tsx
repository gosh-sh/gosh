import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Navigate, useOutletContext } from 'react-router-dom'
import { FormikInput } from '../../components/Formik'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { useSmv, useSmvTokenTransfer } from 'react-gosh'
import { toast } from 'react-toastify'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import yup from '../../yup-extended'

type TMoveBalanceFormValues = {
    amount: number
}

type TSend2InternalFormValues = {
    username: string
    amount: number
}

const DaoWalletPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { adapter: smv, details } = useSmv(dao)
    const { transferToSmv, transferToWallet, releaseAll, transferToInternal } =
        useSmvTokenTransfer(smv, dao.adapter)

    const onMoveBalanceToSmvBalance = async (values: TMoveBalanceFormValues) => {
        try {
            await transferToSmv(values.amount)
            toast.success('Submitted, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onMoveSmvBalanceToBalance = async (values: TMoveBalanceFormValues) => {
        try {
            await transferToWallet(values.amount)
            toast.success('Submitted, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onReleaseSmvTokens = async () => {
        try {
            await releaseAll()
            toast.success('Release submitted, tokens will be released soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onSendToInternal = async (
        values: TSend2InternalFormValues,
        helpers: FormikHelpers<TSend2InternalFormValues>,
    ) => {
        try {
            const { username, amount } = values
            await transferToInternal(username, amount)

            toast.success('Tokens were successfuly sent')
            helpers.resetForm()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthMember && !dao.details.isAuthLimited) {
        return <Navigate to={`/o/${dao.details.name}`} />
    }

    return (
        <>
            <SmvBalance adapter={smv} details={details} className="mb-4 !px-0" />

            <div className="divide-y divide-gray-e6edff">
                <div className="py-5">
                    <h3 className="text-lg font-medium">Topup SMV balance</h3>
                    <p className="mb-3">
                        Move tokens from wallet balance to SMV balance to get an ability
                        to create new proposals and vote
                    </p>
                    <Formik
                        initialValues={{ amount: details.smvBalance }}
                        onSubmit={onMoveBalanceToSmvBalance}
                        validationSchema={yup.object().shape({
                            amount: yup
                                .number()
                                .min(0)
                                .max(details.smvBalance)
                                .required('Field is required'),
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form className="flex flex-wrap items-baseline gap-3">
                                <div className="grow sm:grow-0">
                                    <Field
                                        name="amount"
                                        component={FormikInput}
                                        placeholder="Amount"
                                        autoComplete="off"
                                        disabled={isSubmitting}
                                        help={
                                            <div>
                                                You can pass 0 to move all <br />
                                                available voting tokens
                                            </div>
                                        }
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || details.isLockerBusy}
                                    isLoading={isSubmitting}
                                >
                                    Move tokens to SMV balance
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="py-5">
                    <h3 className="text-lg font-medium">Release tokens</h3>
                    <p className="mb-3">
                        Move tokens from SMV balance back to wallet balance
                    </p>
                    <Formik
                        initialValues={{
                            amount: details.smvAvailable - details.smvLocked,
                        }}
                        onSubmit={onMoveSmvBalanceToBalance}
                        validationSchema={yup.object().shape({
                            amount: yup
                                .number()
                                .min(1)
                                .max(details.smvAvailable - details.smvLocked)
                                .required('Field is required'),
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form className="flex flex-wrap items-baseline gap-3">
                                <div className="grow sm:grow-0">
                                    <Field
                                        name="amount"
                                        component={FormikInput}
                                        placeholder="Amount"
                                        autoComplete="off"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || details.isLockerBusy}
                                    isLoading={isSubmitting}
                                >
                                    Move tokens to wallet
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="py-5">
                    <h3 className="text-lg font-medium">Release locked tokens</h3>
                    <p className="mb-3">
                        Release locked tokens from all completed proposals back to SMV
                        balance
                    </p>
                    <Formik
                        initialValues={{}}
                        onSubmit={onReleaseSmvTokens}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || details.isLockerBusy}
                                    isLoading={isSubmitting}
                                >
                                    Release locked tokens
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </div>

                {dao.details.version !== '1.0.0' && (
                    <div className="py-5">
                        <h3 className="text-lg font-medium mb-3">
                            Send tokens to DAO member
                        </h3>
                        <Formik
                            initialValues={{
                                username: '',
                                amount: 0,
                            }}
                            onSubmit={onSendToInternal}
                            validationSchema={yup.object().shape({
                                username: yup.string().username().required(),
                                amount: yup
                                    .number()
                                    .min(1)
                                    .max(details.smvBalance)
                                    .required('Field is required'),
                            })}
                            enableReinitialize
                        >
                            {({ isSubmitting }) => (
                                <Form className="flex flex-wrap items-baseline gap-3">
                                    <div className="grow sm:grow-0">
                                        <Field
                                            name="username"
                                            component={FormikInput}
                                            placeholder="Username"
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grow sm:grow-0">
                                        <Field
                                            name="amount"
                                            component={FormikInput}
                                            placeholder="Amount"
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        isLoading={isSubmitting}
                                    >
                                        Send tokens
                                    </Button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                )}
            </div>
        </>
    )
}

export default DaoWalletPage
