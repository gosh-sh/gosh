import { Field, Form, Formik } from 'formik'
import { classNames, TDao, useUser } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ToastError, ToastSuccess } from '../../../components/Toast'
import { Button } from '../../../components/Form'
import { FormikTextarea } from '../../../components/Formik'
import { supabase } from '../../../helpers'
import yup from '../../../yup-extended'
import { EDaoInviteStatus } from '../../../store/onboarding.types'

type TDaoInvitationSubmitProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    username: string
    tokenId: string
}

const DaoInvitationSubmit = (props: TDaoInvitationSubmitProps) => {
    const { dao, username, tokenId } = props
    const navigate = useNavigate()
    const { user } = useUser()

    const onFormSubmit = async (values: { comment: string }) => {
        try {
            const { comment } = values
            await dao.adapter.createMember({
                members: [{ username: user.username!, allowance: 0, comment }],
            })

            await supabase
                .from('dao_invite')
                .update({
                    recipient_username: username,
                    recipient_status: EDaoInviteStatus.PROPOSAL_CREATED,
                    token_expired: true,
                })
                .eq('id', tokenId)

            toast.success(
                <ToastSuccess
                    message={{
                        title: 'Invitation accepted',
                        content:
                            'You will become a DAO member after proposal will be accepted',
                    }}
                />,
            )
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <div className="flex flex-wrap gap-6 items-center mb-8">
                <div>
                    <h3 className="text-xl font-medium">Submit invitation</h3>
                </div>
            </div>

            <div
                className={classNames(
                    'w-full lg:w-1/2 p-5',
                    'border border-gray-e6edff rounded-xl',
                )}
            >
                <Formik
                    initialValues={{ comment: '' }}
                    onSubmit={onFormSubmit}
                    validationSchema={yup.object().shape({
                        comment: yup.string().required(),
                    })}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div className="mb-3">
                                <Field
                                    name="comment"
                                    component={FormikTextarea}
                                    autoComplete="off"
                                    placeholder="Input short comment about who you are"
                                    disabled={
                                        isSubmitting || !dao.details.isAskMembershipOn
                                    }
                                />
                            </div>

                            <div className="mt-6">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={
                                        isSubmitting || !dao.details.isAskMembershipOn
                                    }
                                    isLoading={isSubmitting}
                                >
                                    Accept invitation
                                </Button>
                            </div>

                            {!dao.details.isAskMembershipOn && (
                                <div className="mt-2 text-xs text-red-ff3b30">
                                    DAO request membership is disabled for now.
                                    <br />
                                    You can continue after this option will be enabled
                                </div>
                            )}
                        </Form>
                    )}
                </Formik>
            </div>
        </>
    )
}

export default DaoInvitationSubmit
