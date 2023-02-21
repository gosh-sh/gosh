import { Form, Formik } from 'formik'
import { toast } from 'react-toastify'
import { classNames, GoshError, TDao, useDaoMemberCreate, useUser } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useCallback, useState } from 'react'
import { debounce } from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { Transition } from '@headlessui/react'
import { Button, Input } from '../../../../../components/Form'
import { supabase } from '../../../../../helpers'
import yup from '../../../../../yup-extended'
import ToastError from '../../../../../components/Error/ToastError'
import { TInvitationSentProps } from '../MemberForm'

type TDaoMemberFormProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    SuccessComponent: React.ComponentType<TInvitationSentProps>
    getDaoInvites(): Promise<void>
    getUsernameByEmail(email: string): Promise<string | null>
}

type TMember = {
    value: string
    type: 'username' | 'email'
    validated: { valid: boolean; message?: string }
}

const DaoMemberForm = (props: TDaoMemberFormProps) => {
    const { dao, getDaoInvites, getUsernameByEmail, SuccessComponent } = props
    const { user } = useUser()
    const createDaoMember = useDaoMemberCreate(dao.adapter)
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
            dao_name: dao.details.name,
            recipient_email: item.value,
            is_recipient_sent: false,
        }))

    const usernamesSelector = members
        .filter(({ type, value }) => !!value && type === 'username')
        .map(({ value }) => value)

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
                await dao.adapter.getGosh().isValidProfile([value])
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
        [dao.adapter],
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
            if (!createDaoMember) {
                throw new GoshError('Add DAO member is not supported')
            }

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
                await getDaoInvites()
            }

            // Add existing profiles to DAO
            const usernamesUnique = Array.from(new Set(usernamesSelector))
            if (usernamesUnique.length) {
                await createDaoMember({ usernames: usernamesUnique })
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
                            <Input
                                type="text"
                                placeholder="GOSH username or email"
                                value={item.value}
                                onChange={(e) => {
                                    onChangeMember(e.target.value, index)
                                }}
                                after={
                                    <button
                                        type="button"
                                        className="px-3 text-gray-53596d"
                                        onClick={() => onRemoveMember(index)}
                                    >
                                        <FontAwesomeIcon icon={faTimes} size="lg" />
                                    </button>
                                }
                            />

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
                            <Button
                                className="w-full"
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    members.some((m) => !m.validated.valid) ||
                                    usernamesSelector.length + emailsSelector.length === 0
                                }
                                isLoading={isSubmitting}
                            >
                                Send invite
                            </Button>
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
                <SuccessComponent
                    hasEmails={!!emailsSelector.length}
                    hasUsernames={!!usernamesSelector.length}
                />
            </Transition>
        </div>
    )
}

export default DaoMemberForm
