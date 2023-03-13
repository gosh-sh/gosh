import { Field, Form, Formik } from 'formik'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ESmvEventType, GoshError, TEventMultipleCreateProposalParams } from 'react-gosh'
import { ToastError } from '../../components/Toast'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { FormikCheckbox, FormikTextarea } from '../../components/Formik'
import { Button } from '../../components/Form'
import _ from 'lodash'

type TFormValues = {
    isMintOn: boolean
    isEventProgressOn: boolean
    isEventDiscussionOn: boolean
    isAskMembershipOn: boolean
    comment: string
}

const DaoSetupPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()

    const isDirty = (values: TFormValues) => {
        return !_.isEqual(
            {
                isMintOn: values.isMintOn,
                isEventProgressOn: values.isEventProgressOn,
                isEventDiscussionOn: values.isEventDiscussionOn,
                isAskMembershipOn: values.isAskMembershipOn,
            },
            {
                isMintOn: dao.details.isMintOn,
                isEventProgressOn: !dao.details.isEventProgressOn,
                isEventDiscussionOn: dao.details.isEventDiscussionOn,
                isAskMembershipOn: dao.details.isAskMembershipOn,
            },
        )
    }

    const onSubmit = async (values: TFormValues) => {
        try {
            if (!isDirty(values)) {
                throw new GoshError('Nothing was changed')
            }

            const proposals: TEventMultipleCreateProposalParams['proposals'] = [
                {
                    type: ESmvEventType.DAO_EVENT_HIDE_PROGRESS,
                    params: { decision: !values.isEventProgressOn },
                },
                {
                    type: ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION,
                    params: { allow: values.isEventDiscussionOn },
                },
                {
                    type: ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE,
                    params: { decision: values.isAskMembershipOn },
                },
            ]
            if (!values.isMintOn) {
                proposals.push({
                    type: ESmvEventType.DAO_TOKEN_MINT_DISABLE,
                    params: {},
                })
            }

            await dao.adapter.createMultiProposal({
                proposals,
                comment: values.comment,
            })
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
        <Formik
            initialValues={{
                isMintOn: dao.details.isMintOn,
                isEventProgressOn: !dao.details.isEventProgressOn,
                isEventDiscussionOn: dao.details.isEventDiscussionOn,
                isAskMembershipOn: dao.details.isAskMembershipOn,
                comment: '',
            }}
            onSubmit={onSubmit}
        >
            {({ isSubmitting, values }) => (
                <Form>
                    <div>
                        <h3 className="text-xl font-medium mb-10">Token setup</h3>
                        <div>
                            <Field
                                type="checkbox"
                                label="Allow mint"
                                name="isMintOn"
                                component={FormikCheckbox}
                                disabled={isSubmitting || !dao.details.isMintOn}
                                inputProps={{
                                    className: 'inline-block',
                                    label: 'Allow mint',
                                }}
                                help={
                                    values.isMintOn
                                        ? 'This option enables the DAO token mint'
                                        : `If you uncheck this option the DAO token supply will be capped to ${dao.details.supply.total}`
                                }
                                helpClassName={values.isMintOn ? null : 'text-red-ff3b30'}
                            />
                        </div>
                    </div>
                    <hr className="my-16 bg-gray-e6edff" />
                    <div>
                        <h3 className="text-xl font-medium mb-10">Proposal setup</h3>
                        <div className="flex flex-col gap-y-8">
                            <div>
                                <Field
                                    type="checkbox"
                                    name="isEventProgressOn"
                                    component={FormikCheckbox}
                                    disabled={isSubmitting}
                                    inputProps={{
                                        label: "Hide voting results until it's over",
                                    }}
                                />
                            </div>
                            <div>
                                <Field
                                    type="checkbox"
                                    name="isEventDiscussionOn"
                                    component={FormikCheckbox}
                                    disabled={isSubmitting}
                                    inputProps={{
                                        label: 'Allow discussions on proposals',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <hr className="my-16 bg-gray-e6edff" />
                    <div>
                        <h3 className="text-xl font-medium mb-10">Members setup</h3>
                        <div>
                            <Field
                                type="checkbox"
                                name="isAskMembershipOn"
                                component={FormikCheckbox}
                                disabled={isSubmitting}
                                inputProps={{
                                    label: 'Allow external users to request DAO membership',
                                }}
                            />
                        </div>
                    </div>
                    <hr className="my-16 bg-gray-e6edff" />
                    <div>
                        <h3 className="text-xl font-medium mb-4">Save changes</h3>
                        <div>
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
                                disabled={isSubmitting || !isDirty(values)}
                            >
                                Save changes and start proposal
                            </Button>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default DaoSetupPage
