import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import Alert from '../../../../components/Alert'
import { Button } from '../../../../components/Form'
import { FormikTextarea } from '../../../../components/Formik'
import { ModalCloseButton } from '../../../../components/Modal'
import { appModalStateAtom } from '../../../../store/app.state'
import { useCreateDaoMember, useDao, useDaoMember } from '../../../hooks/dao.hooks'
import { useUser } from '../../../hooks/user.hooks'
import { EDaoMemberType } from '../../../types/dao.types'
import yup from '../../../yup-extended'

type TFormValues = {
    comment: string
}

const RequestDaoMembershipModal = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const { createMember } = useCreateDaoMember()

    const disabled = !dao.details.isAskMembershipOn || !member.isReady || member.isMember
    const is_fetching = dao.isFetching || !member.isReady

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onRequestMembership = async (values: TFormValues) => {
        try {
            const { comment } = values
            const { eventaddr } = await createMember(
                [
                    {
                        user: { name: user.username!, type: EDaoMemberType.User },
                        allowance: 0,
                        comment,
                    },
                ],
                true,
            )
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
                initialValues={{ comment: '' }}
                onSubmit={onRequestMembership}
                validationSchema={yup.object().shape({
                    comment: yup.string().required(),
                })}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />
                        <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                            Request membership
                        </Dialog.Title>

                        {!is_fetching && !dao.details.isAskMembershipOn && (
                            <Alert variant="danger" className="mb-4">
                                <h1 className="font-medium">
                                    Request membership is disabled
                                </h1>
                                <p className="mt-1 text-xs">
                                    DAO has disabled request membership, you should
                                    contact one of the DAO members to ask to invite you
                                </p>
                            </Alert>
                        )}

                        {!is_fetching && member.isMember && (
                            <Alert variant="danger" className="mb-4">
                                <h1 className="font-medium">Already a DAO member</h1>
                                <p className="mt-1 text-xs">
                                    You are already a member of this DAO
                                </p>
                            </Alert>
                        )}

                        <div>
                            <Field
                                name="comment"
                                component={FormikTextarea}
                                disabled={isSubmitting || disabled}
                                autoComplete="off"
                                placeholder="Write description of your request to DAO membership"
                                maxRows={5}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={isSubmitting || is_fetching}
                                disabled={isSubmitting || disabled}
                            >
                                {is_fetching ? 'Fetching data' : 'Create proposal'}
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

export { RequestDaoMembershipModal }
