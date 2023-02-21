import { Field, Form, Formik } from 'formik'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useDaoSettingsManage, useDaoMint } from 'react-gosh'
import ToastError from '../../components/Error/ToastError'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import yup from '../../yup-extended'
import { FormikCheckbox, FormikInput, FormikTextarea } from '../../components/Formik'
import { Button } from '../../components/Form'

type TSupplyFormValues = {
    amount: number
    comment?: string
}

type TMintFormValues = {
    mint: boolean
    comment?: string
}

type TBooleanFormValues = {
    value: boolean
    comment?: string
}

const DaoSetupPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const mint = useDaoMint(dao.adapter)
    const daoSettingsManage = useDaoSettingsManage(dao.adapter)
    const navigate = useNavigate()

    const onMint = async (values: TSupplyFormValues) => {
        try {
            await mint(values.amount, values.comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onMintDisable = async (values: TMintFormValues) => {
        try {
            await daoSettingsManage.disableMint(values.comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onEventShowProgress = async (values: TBooleanFormValues) => {
        try {
            const { value, comment } = values
            await daoSettingsManage.updateEventShowProgress({ decision: !value, comment })
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onEventAllowDiscussion = async (values: TBooleanFormValues) => {
        try {
            const { value, comment } = values
            await daoSettingsManage.updateEventAllowDiscussion({ allow: value, comment })
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onAskMembershipAllowance = async (values: TBooleanFormValues) => {
        try {
            const { value, comment } = values
            await daoSettingsManage.updateAskMembershipAllowance(value, comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (dao.details.version === '1.0.0') {
        return <Navigate to={`/o/${dao.details.name}/settings/upgrade`} />
    }
    return (
        <>
            <h3 className="text-xl font-medium mb-10">Token setup</h3>
            <div className="divide-y divide-gray-e6edff">
                <div className="pb-10">
                    <Formik
                        initialValues={{ mint: dao.details.isMintOn }}
                        onSubmit={onMintDisable}
                    >
                        {({ isSubmitting, values }) => (
                            <Form>
                                <div>
                                    <Field
                                        type="checkbox"
                                        label="Allow mint"
                                        name="mint"
                                        component={FormikCheckbox}
                                        disabled={isSubmitting || !dao.details.isMintOn}
                                        inputProps={{
                                            className: 'inline-block',
                                            label: 'Allow mint',
                                        }}
                                        help={
                                            values.mint
                                                ? 'This option enables the DAO token mint'
                                                : `If you uncheck this option the DAO token supply will be capped to ${dao.details.supply.total}`
                                        }
                                        helpClassName={
                                            values.mint ? null : 'text-red-ff3b30'
                                        }
                                    />
                                </div>
                                {dao.details.isMintOn && (
                                    <>
                                        <div className="mt-4">
                                            <Field
                                                name="comment"
                                                component={FormikTextarea}
                                                disabled={isSubmitting}
                                                placeholder="Leave your comment"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Button
                                                type="submit"
                                                isLoading={isSubmitting}
                                                disabled={isSubmitting || values.mint}
                                            >
                                                Save changes and start proposal
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="pt-10">
                    <Formik
                        initialValues={{ amount: 0 }}
                        validationSchema={yup.object().shape({
                            amount: yup.number().integer().positive().required(),
                        })}
                        onSubmit={onMint}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <div className="w-1/3">
                                    <Field
                                        label="Mint tokens"
                                        name="amount"
                                        component={FormikInput}
                                        disabled={isSubmitting || !dao.details.isMintOn}
                                        placeholder="Amount to mint"
                                        autoComplete="off"
                                        help={`Current total supply is ${dao.details.supply.total}`}
                                    />
                                </div>
                                {dao.details.isMintOn && (
                                    <>
                                        <div className="mt-4">
                                            <Field
                                                name="comment"
                                                component={FormikTextarea}
                                                disabled={isSubmitting}
                                                placeholder="Leave your comment"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Button
                                                type="submit"
                                                isLoading={isSubmitting}
                                                disabled={isSubmitting}
                                            >
                                                Save changes and start proposal
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>

            <h3 className="text-xl font-medium mt-14 mb-10">Proposal setup</h3>
            <div className="divide-y divide-gray-e6edff">
                <div className="pb-10">
                    <Formik
                        initialValues={{ value: !dao.details.isEventProgressOn }}
                        onSubmit={onEventShowProgress}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <div>
                                    <Field
                                        type="checkbox"
                                        name="value"
                                        component={FormikCheckbox}
                                        disabled={isSubmitting}
                                        inputProps={{
                                            label: "Hide voting results until it's over",
                                        }}
                                    />
                                </div>
                                <div className="mt-4">
                                    <Field
                                        name="comment"
                                        component={FormikTextarea}
                                        disabled={isSubmitting}
                                        placeholder="Leave your comment"
                                    />
                                </div>
                                <div className="mt-4">
                                    <Button
                                        type="submit"
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        Save changes and start proposal
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="pt-10">
                    <Formik
                        initialValues={{ value: dao.details.isEventDiscussionOn }}
                        onSubmit={onEventAllowDiscussion}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <div>
                                    <Field
                                        type="checkbox"
                                        name="value"
                                        component={FormikCheckbox}
                                        disabled={isSubmitting}
                                        inputProps={{
                                            label: 'Allow discussions on proposals',
                                        }}
                                    />
                                </div>
                                <div className="mt-4">
                                    <Field
                                        name="comment"
                                        component={FormikTextarea}
                                        disabled={isSubmitting}
                                        placeholder="Leave your comment"
                                    />
                                </div>
                                <div className="mt-4">
                                    <Button
                                        type="submit"
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        Save changes and start proposal
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>

            <h3 className="text-xl font-medium mt-14 mb-10">Members setup</h3>
            <div className="divide-y divide-gray-e6edff">
                <div className="pb-10">
                    <Formik
                        initialValues={{ value: dao.details.isAskMembershipOn }}
                        onSubmit={onAskMembershipAllowance}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <div>
                                    <Field
                                        type="checkbox"
                                        name="value"
                                        component={FormikCheckbox}
                                        disabled={isSubmitting}
                                        inputProps={{
                                            label: 'Allow external users to request DAO membership',
                                        }}
                                    />
                                </div>
                                <div className="mt-4">
                                    <Field
                                        name="comment"
                                        component={FormikTextarea}
                                        disabled={isSubmitting}
                                        placeholder="Leave your comment"
                                    />
                                </div>
                                <div className="mt-4">
                                    <Button
                                        type="submit"
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        Save changes and start proposal
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </>
    )
}

export default DaoSetupPage
