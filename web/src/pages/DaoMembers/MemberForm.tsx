import { Form, Formik } from 'formik'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import { classNames, GoshError, useDaoMemberCreate, useUser } from 'react-gosh'
import ToastError from '../../components/Error/ToastError'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useParams } from 'react-router-dom'
import { useCallback, useState } from 'react'
import { debounce } from 'lodash'
import yup from '../../yup-extended'
import { supabase } from '../../helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import successImage from '../../assets/images/success.png'
import { Transition } from '@headlessui/react'

type TDaoMemberFormProps = {
    dao: IGoshDaoAdapter
}

type TInvitationSentProps = {
    hasUsernames: boolean
    hasEmails: boolean
}

type TMember = {
    value: string
    type: 'username' | 'email'
    validated: { valid: boolean; message?: string }
}

const InvitationSent = (props: TInvitationSentProps) => {
    const { hasEmails, hasUsernames } = props

    return (
        <div className="bg-white">
            <div className="max-w-[9.75rem] mx-auto">
                <img src={successImage} alt="Success" className="w-full" />
            </div>
            <div className="mt-6">
                <h3 className="text-xl font-medium text-center mb-4">Success</h3>
                {hasEmails && (
                    <p className="text-gray-7c8db5 text-sm mb-3">
                        Users invited by email will receive invitation email message
                    </p>
                )}
                {hasUsernames && (
                    <p className="text-gray-7c8db5 text-sm">
                        Users invited by GOSH username are added to proposal and waiting
                        for voting
                    </p>
                )}
            </div>
        </div>
    )
}

const DaoMemberForm = (props: TDaoMemberFormProps) => {
    const { dao } = props
    const { daoName } = useParams()
    const { user } = useUser()
    const createDaoMember = useDaoMemberCreate(dao)
    const [members, setMembers] = useState<TMember[]>([
        { value: '', type: 'username', validated: { valid: true } },
    ])
    const [transition, setTransition] = useState<{ form: boolean; success: boolean }>({
        form: true,
        success: false,
    })

    const emailsSelector = members
        .filter(({ type, value }) => !!value && type === 'email')
        .map((item) => ({
            sender_username: user!.username,
            dao_name: daoName,
            recipient_email: item.value,
            is_recipient_sent: false,
        }))

    const usernamesSelector = members
        .filter(({ type, value }) => !!value && type === 'username')
        .map(({ value }) => value)

    const getUsernameByEmail = async (email: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('gosh_username')
            .eq('email', email)
            .order('created_at', { ascending: true })
        if (error) {
            console.warn('Error query user by email', error)
            return null
        }
        return data.length ? data[0].gosh_username : null
    }

    const validateMemberDebounced = useCallback(
        debounce(async (value: string, index: number) => {
            const _updateStateItem = (updated: object) => {
                setMembers((state) =>
                    state.map((item, i) => {
                        if (i !== index) {
                            return item
                        }
                        return { ...item, ...updated }
                    }),
                )
            }

            if (!value) {
                return _updateStateItem({ type: 'username', validated: { valid: true } })
            }

            // Validate email
            if (value.indexOf('@') >= 0) {
                const schema = yup.string().email()
                const isValid = schema.isValidSync(value)
                if (!isValid) {
                    return _updateStateItem({
                        type: 'email',
                        validated: { valid: false, message: 'Invalid email format' },
                    })
                }

                // Try to find GOSH username by email
                const username = await getUsernameByEmail(value)
                if (username) {
                    return _updateStateItem({
                        type: 'username',
                        value: username,
                        validated: {
                            valid: true,
                            message: 'SMV proposal will be created',
                        },
                    })
                } else {
                    return _updateStateItem({
                        type: 'email',
                        validated: {
                            valid: true,
                            message: 'Invitation email will be sent',
                        },
                    })
                }
            }

            // Validate username
            try {
                await dao.getGosh().isValidProfile([value])
                return _updateStateItem({
                    type: 'username',
                    validated: { valid: true, message: 'SMV proposal will be created' },
                })
            } catch (e: any) {
                return _updateStateItem({
                    type: 'username',
                    validated: { valid: false, message: e.message },
                })
            }
        }, 500),
        [dao],
    )

    const onAddMember = () => {
        setMembers((state) => [
            ...state,
            { value: '', type: 'username', validated: { valid: true } },
        ])
    }

    const onRemoveMember = (index: number) => {
        setMembers((state) => {
            const items = [...state]
            items.splice(index, 1)
            return items
        })
    }

    const onChangeMember = async (value: string, index: number) => {
        setMembers((state) =>
            state.map((item, i) => {
                if (i !== index) {
                    return item
                }
                return { ...item, value }
            }),
        )
        validateMemberDebounced(value, index)
    }

    const onCreateMember = async () => {
        try {
            // Save invites by emails to database
            const emailStringList = emailsSelector.map(
                ({ recipient_email }) => recipient_email,
            )
            const emailsUnique = emailsSelector.filter(({ recipient_email }, index) => {
                return emailStringList.indexOf(recipient_email) === index
            })
            if (emailsUnique.length) {
                const { error } = await supabase.from('dao_invite').insert(emailsUnique)
                if (error) {
                    throw new GoshError(error.message)
                }
            }

            // Add existing profiles to DAO
            const usernamesUnique = Array.from(new Set(usernamesSelector))
            if (usernamesUnique.length) {
                await createDaoMember(usernamesUnique)
            }

            // Completion staff
            setTransition({ form: false, success: false })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div>
            <Transition
                show={transition.form}
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                beforeEnter={() => {
                    setMembers([
                        { value: '', type: 'username', validated: { valid: true } },
                    ])
                }}
                afterLeave={() => setTransition({ form: false, success: true })}
            >
                <h3 className="text-xl font-medium mb-4">Invite user to DAO</h3>
                <div className="mb-12">
                    {members.map((item, index) => (
                        <div key={index} className="mb-4">
                            <div
                                className={classNames(
                                    'input flex items-center',
                                    !item.validated.valid ? 'has-error' : null,
                                )}
                            >
                                <input
                                    type="text"
                                    className="element !text-sm !py-2"
                                    placeholder="GOSH username or email"
                                    value={item.value}
                                    onChange={(e) => {
                                        onChangeMember(e.target.value, index)
                                    }}
                                />
                                <div>
                                    <button
                                        type="button"
                                        className="px-3 text-gray-53596d"
                                        onClick={() => onRemoveMember(index)}
                                    >
                                        <FontAwesomeIcon icon={faTimes} size="lg" />
                                    </button>
                                </div>
                            </div>
                            {item.validated.message && (
                                <div
                                    className={classNames(
                                        'text-xs',
                                        item.validated.valid
                                            ? 'text-gray-53596d'
                                            : 'text-red-dd3a3a',
                                    )}
                                >
                                    {item.validated.message}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="text-gray-7c8db5">
                        <button type="button" onClick={onAddMember}>
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            Add member
                        </button>
                    </div>
                </div>
                <Formik initialValues={{}} onSubmit={onCreateMember}>
                    {({ isSubmitting }) => (
                        <Form>
                            <button
                                type="submit"
                                className="!block btn btn--body px-3 py-3 w-full"
                                disabled={
                                    isSubmitting ||
                                    members.some((m) => !m.validated.valid) ||
                                    usernamesSelector.length + emailsSelector.length === 0
                                }
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Send invite
                            </button>
                        </Form>
                    )}
                </Formik>
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
                <InvitationSent
                    hasEmails={!!emailsSelector.length}
                    hasUsernames={!!usernamesSelector.length}
                />
            </Transition>
        </div>
    )
}

export default DaoMemberForm
