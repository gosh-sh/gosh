import { ErrorMessage, Field, FieldArray, Form, Formik } from 'formik'
import { toast } from 'react-toastify'
import { GoshError, TDao, useDaoMemberCreate, useUser } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { Transition } from '@headlessui/react'
import { Button } from '../../../../../components/Form'
import { isValidEmail, supabase, ToastOptionsShortcuts } from '../../../../../helpers'
import yup from '../../../../../yup-extended'
import { ToastError } from '../../../../../components/Toast'
import { Buffer } from 'buffer'
import clipboardy from 'clipboardy'
import AsyncCreatableSelect from 'react-select/async-creatable'
import { FormikInput, FormikTextarea } from '../../../../../components/Formik'

type TDaoMemberFormProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    SuccessComponent: React.ComponentType<any>
    getDaoInvites(): Promise<void>
    getUsernameByEmail(email: string): Promise<string | null>
}

type TFormValues = {
    members: {
        username: string
        usertype: string
        allowance: string
        comment: string
    }[]
}

const isAskMembershipOnError =
    'Enable "Allow external users to request DAO membership" option in DAO settings to enable invites by email/link'

const DaoMemberForm = (props: TDaoMemberFormProps) => {
    const { dao, getDaoInvites, getUsernameByEmail, SuccessComponent } = props
    const { user } = useUser()
    const createDaoMember = useDaoMemberCreate(dao.adapter)
    const [transition, setTransition] = useState<{ form: boolean; success: boolean }>({
        form: true,
        success: false,
    })

    const getUsernameOptions = async (input: string) => {
        if (input.indexOf('@') >= 0) {
            const username = await getUsernameByEmail(input)
            if (username) {
                return [{ label: username, value: { name: username, type: 'user' } }]
            }
            return []
        }

        const options: any[] = []
        const gosh = dao.adapter.getGosh()
        const profileQuery = await gosh.getProfile({ username: input })
        if (await profileQuery.isDeployed()) {
            options.push({
                label: input,
                value: { name: input, type: 'user' },
            })
        }

        const daoQuery = await gosh.getDao({ name: input, useAuth: false })
        if (await daoQuery.isDeployed()) {
            options.push({
                label: input,
                value: { name: input, type: 'dao' },
            })
        }
        return options
    }

    const getInvitationToken = () => {
        const data = {
            dao: dao.details.name,
            nonce: Date.now() + Math.round(Math.random() * 1000),
        }
        return Buffer.from(JSON.stringify(data)).toString('base64')
    }

    const onCreateMember = async (values: TFormValues) => {
        try {
            const { members } = values

            if (!createDaoMember) {
                throw new GoshError('Add DAO member is not supported')
            }

            // Check total allowance against reserve
            const sumAllowance = members.reduce((_sum, { allowance }) => {
                return _sum + parseInt(allowance)
            }, 0)
            if (sumAllowance > dao.details.supply.reserve) {
                throw new GoshError('Allowance error', {
                    allowance: sumAllowance,
                    reserve: dao.details.supply.reserve,
                    message:
                        'Members total allowance can not be greater than DAO reserve',
                })
            }

            // Save invites by emails to database
            const memberEmails = members
                .filter(({ usertype }) => usertype === 'email')
                .map((item) => ({
                    sender_username: user!.username,
                    dao_name: dao.details.name,
                    recipient_email: item.username,
                    recipient_allowance: parseInt(item.allowance),
                    recipient_comment: item.comment,
                    is_recipient_sent: false,
                    token: getInvitationToken(),
                    token_expired: false,
                }))
            const memberEmailsList = memberEmails.map(
                ({ recipient_email }) => recipient_email,
            )
            const memberEmailsUnique = memberEmails.filter(
                ({ recipient_email }, index) => {
                    return memberEmailsList.indexOf(recipient_email) === index
                },
            )
            if (memberEmailsUnique.length) {
                const { error } = await supabase
                    .from('dao_invite')
                    .insert(memberEmailsUnique)
                if (error) {
                    throw new GoshError(error.message)
                }
                await getDaoInvites()
            }

            // Add existing profiles to DAO
            const memberProfiles = members
                .filter(({ usertype }) => usertype !== 'email')
                .map((item) => ({
                    user: {
                        name: item.username,
                        type: item.usertype,
                    },
                    allowance: parseInt(item.allowance),
                    comment: item.comment,
                    expired: 0,
                }))
            const memberProfilesList = memberProfiles.map(({ user }) => {
                return `${user.name}.${user.type}`
            })
            const memberProfilesUnique = memberProfiles.filter(({ user }, index) => {
                return memberProfilesList.indexOf(`${user.name}.${user.type}`) === index
            })
            if (memberProfilesUnique.length) {
                await createDaoMember({ members: memberProfilesUnique })
            }

            // Completion staff
            setTransition({ form: false, success: false })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onCreateInvitationLink = async () => {
        try {
            const token = getInvitationToken()
            await supabase.from('dao_invite').insert({
                dao_name: dao.details.name,
                sender_username: user.username,
                is_recipient_sent: true,
                token,
                token_expired: false,
            })
            await clipboardy.write(
                `${window.location.origin}/o/${dao.details.name}/onboarding?token=${token}`,
            )
            await getDaoInvites()

            toast.success('Copied', ToastOptionsShortcuts.CopyMessage)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <Transition
                show={transition.form}
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => setTransition({ form: false, success: true })}
            >
                <h3 className="text-xl font-medium mb-4">Invite user to DAO</h3>
                <Formik
                    initialValues={{ members: [] }}
                    onSubmit={onCreateMember}
                    validationSchema={yup.object().shape({
                        members: yup
                            .array(
                                yup.object({
                                    username: yup.string().required('Field is required'),
                                    usertype: yup.string().required('Field is required'),
                                    allowance: yup
                                        .number()
                                        .integer()
                                        .test(
                                            'test-zeropositive',
                                            'Should be >= 0',
                                            (v) => !v || v >= 0,
                                        )
                                        .required('Field is required'),
                                    comment: yup.string().required('Field is required'),
                                }),
                            )
                            .min(1)
                            .max(10),
                    })}
                >
                    {({ values, setFieldValue, isSubmitting, errors, touched }) => (
                        <Form>
                            <FieldArray name="members">
                                {(arrayHelpers) => (
                                    <>
                                        {values.members.map((_, index) => (
                                            <div key={index} className="py-2">
                                                <AsyncCreatableSelect
                                                    className="text-sm"
                                                    isClearable={true}
                                                    placeholder="Input username, dao name or email"
                                                    cacheOptions={false}
                                                    defaultOptions={false}
                                                    loadOptions={getUsernameOptions}
                                                    formatOptionLabel={(data) => {
                                                        return `${data.label} (${data.value.type})`
                                                    }}
                                                    formatCreateLabel={(input) => {
                                                        return `Send invitation to ${input}`
                                                    }}
                                                    isValidNewOption={(input) => {
                                                        return (
                                                            !!input && isValidEmail(input)
                                                        )
                                                    }}
                                                    getNewOptionData={(input, label) => {
                                                        return {
                                                            label,
                                                            value: {
                                                                name: input,
                                                                type: 'email',
                                                            },
                                                        }
                                                    }}
                                                    onChange={(value) => {
                                                        setFieldValue(
                                                            `members.${index}.username`,
                                                            value ? value.value.name : '',
                                                            true,
                                                        )
                                                        setFieldValue(
                                                            `members.${index}.usertype`,
                                                            value ? value.value.type : '',
                                                            true,
                                                        )
                                                    }}
                                                    isDisabled={isSubmitting}
                                                />
                                                <ErrorMessage
                                                    className="text-xs text-red-ff3b30 mt-1"
                                                    component="div"
                                                    name={`members.${index}.username`}
                                                />

                                                <div className="mt-3">
                                                    <Field
                                                        name={`members.${index}.allowance`}
                                                        component={FormikInput}
                                                        placeholder="Karma"
                                                        autoComplete="off"
                                                        disabled={isSubmitting}
                                                    />
                                                    <ErrorMessage
                                                        className="text-xs text-red-ff3b30 mt-1"
                                                        component="div"
                                                        name={`members.${index}.allowance`}
                                                    />
                                                </div>

                                                <div className="mt-3">
                                                    <Field
                                                        name={`members.${index}.comment`}
                                                        component={FormikTextarea}
                                                        placeholder="Comment your decision"
                                                        autoComplete="off"
                                                        disabled={isSubmitting}
                                                    />
                                                    <ErrorMessage
                                                        className="text-xs text-red-ff3b30 mt-1"
                                                        component="div"
                                                        name={`members.${index}.comment`}
                                                    />
                                                </div>

                                                <div className="text-right mt-2">
                                                    <button
                                                        type="button"
                                                        className="p-1 text-sm text-gray-7c8db5"
                                                        disabled={isSubmitting}
                                                        onClick={() =>
                                                            arrayHelpers.remove(index)
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faTimes}
                                                            size="lg"
                                                            className="mr-2"
                                                        />
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="text-gray-7c8db5">
                                            {values.members.length < 10 && (
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() =>
                                                        arrayHelpers.push({
                                                            username: '',
                                                            usertype: '',
                                                            allowance: '',
                                                            comment: '',
                                                        })
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faPlus}
                                                        className="mr-2"
                                                    />
                                                    Add member
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </FieldArray>
                            <div className="mt-8">
                                <Button
                                    className="w-full"
                                    type="submit"
                                    disabled={isSubmitting || !values.members.length}
                                    isLoading={isSubmitting}
                                >
                                    Send invite
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>

                <hr className="mt-10 mb-6 bg-gray-e6edff" />

                <div>
                    <div className="mb-2 text-sm text-gray-7c8db5">
                        Or send one-time invitation link to single user
                    </div>
                    <Formik onSubmit={onCreateInvitationLink} initialValues={{}}>
                        {({ isSubmitting }) => (
                            <Form>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isSubmitting}
                                    disabled={
                                        isSubmitting || !dao.details.isAskMembershipOn
                                    }
                                >
                                    Get one-time invitation link
                                </Button>

                                {!dao.details.isAskMembershipOn && (
                                    <div className="mt-2 text-xs text-red-ff3b30">
                                        {isAskMembershipOnError}
                                    </div>
                                )}
                            </Form>
                        )}
                    </Formik>
                </div>
            </Transition>

            <Transition
                show={transition.success}
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterEnter={() => {
                    setTimeout(() => {
                        setTransition({ form: false, success: false })
                    }, 7000)
                }}
                afterLeave={() => setTransition({ form: true, success: false })}
            >
                <SuccessComponent />
            </Transition>
        </>
    )
}

export default DaoMemberForm
