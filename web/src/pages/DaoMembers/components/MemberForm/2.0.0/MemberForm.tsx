import { Form, Formik } from 'formik'
import { toast } from 'react-toastify'
import { classNames, GoshError, TDao, useDaoMemberCreate, useUser } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useCallback, useEffect, useState } from 'react'
import { debounce } from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { Transition } from '@headlessui/react'
import { Button, Input, Textarea } from '../../../../../components/Form'
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
    name: {
        value: string
        validated: { valid: boolean; message?: string }
    }
    allowance: {
        value: number
        validated: { valid: boolean; message?: string }
    }
    comment: {
        value: string
        validated: { valid: boolean; message?: string }
    }
    type: 'username' | 'email'
}

const emptyMemberItem: TMember = {
    name: { value: '', validated: { valid: true } },
    allowance: { value: 0, validated: { valid: true } },
    comment: { value: '', validated: { valid: true } },
    type: 'username',
}

const DaoMemberForm = (props: TDaoMemberFormProps) => {
    const { dao, getDaoInvites, getUsernameByEmail, SuccessComponent } = props
    const { user } = useUser()
    const createDaoMember = useDaoMemberCreate(dao.adapter)
    const [members, setMembers] = useState<TMember[]>([emptyMemberItem])
    const [reserve, setReserve] = useState<number>(dao.details.supply.reserve)
    const [transition, setTransition] = useState<{ form: boolean; success: boolean }>({
        form: true,
        success: false,
    })

    const emailsSelector = members
        .filter(({ type, name }) => !!name.value && type === 'email')
        .map(({ name, allowance, comment }) => ({
            sender_username: user!.username,
            dao_name: dao.details.name,
            recipient_email: name.value,
            recipient_allowance: allowance.value,
            recipient_comment: comment.value,
            is_recipient_sent: false,
        }))

    const usernamesSelector = members
        .filter(({ type, name }) => !!name.value && type === 'username')
        .map(({ name, allowance, comment }) => ({
            username: name.value,
            allowance: allowance.value,
            comment: comment.value,
        }))

    const hasErrorsSelector = members.some(
        ({ name, allowance }) => !name.validated.valid || !allowance.validated.valid,
    )

    const updateMembersStateItem = (index: number, updated: any) => {
        setMembers((state) =>
            state.map((item, i) => {
                if (i !== index) {
                    return item
                }

                const key = Object.keys(updated)[0] as 'name' | 'allowance' | 'comment'
                if (['name', 'allowance', 'comment'].indexOf(key) >= 0) {
                    const subitem = item[key]
                    return {
                        ...item,
                        type: updated.type || item.type,
                        [key]: { ...subitem, ...updated[key] },
                    }
                }
                return { ...item, ...updated }
            }),
        )
    }

    const validateMemberDebounced = useCallback(
        debounce(async (value: string, index: number) => {
            if (!value) {
                return updateMembersStateItem(index, {
                    type: 'username',
                    name: { value, validated: { valid: true } },
                })
            }

            // Validate email
            if (value.indexOf('@') >= 0) {
                const schema = yup.string().email()
                const isValid = schema.isValidSync(value)
                if (!isValid) {
                    return updateMembersStateItem(index, {
                        type: 'email',
                        name: {
                            value,
                            validated: { valid: false, message: 'Invalid email format' },
                        },
                    })
                }

                // Try to find GOSH username by email
                const username = await getUsernameByEmail(value)
                if (username) {
                    return updateMembersStateItem(index, {
                        type: 'username',
                        name: {
                            value: username,
                            validated: {
                                valid: true,
                                message: 'SMV proposal will be created',
                            },
                        },
                    })
                } else {
                    return updateMembersStateItem(index, {
                        type: 'email',
                        name: {
                            value,
                            validated: {
                                valid: true,
                                message: 'Invitation email will be sent',
                            },
                        },
                    })
                }
            }

            // Validate username
            try {
                await dao.adapter.getGosh().isValidProfile([value])
                return updateMembersStateItem(index, {
                    type: 'username',
                    name: {
                        value,
                        validated: {
                            valid: true,
                            message: 'SMV proposal will be created',
                        },
                    },
                })
            } catch (e: any) {
                return updateMembersStateItem(index, {
                    type: 'username',
                    name: { value, validated: { valid: false, message: e.message } },
                })
            }
        }, 500),
        [dao.adapter],
    )

    const validateMemberAllowance = (value: string, index: number) => {
        updateMembersStateItem(index, { allowance: { validated: { valid: true } } })

        const test = yup.object().shape({
            value: yup
                .number()
                .integer()
                .test('is-zeropositive', 'Should be >= 0', (v) => !v || v >= 0),
        })
        try {
            test.validateSync({ value })
            updateMembersStateItem(index, { allowance: { value: parseInt(value) } })
        } catch (e: any) {
            updateMembersStateItem(index, {
                allowance: { validated: { valid: false, message: e.message } },
            })
        }
    }

    const onAddMember = () => {
        setMembers((state) => [...state, emptyMemberItem])
    }

    const onRemoveMember = (index: number) => {
        setMembers((state) => {
            const items = [...state]
            items.splice(index, 1)
            return items
        })
    }

    const onChangeMemberName = async (value: string, index: number) => {
        updateMembersStateItem(index, { name: { value } })
        validateMemberDebounced(value, index)
    }

    const onChangeMemberAllowance = (value: string, index: number) => {
        updateMembersStateItem(index, { allowance: { value } })
        validateMemberAllowance(value, index)
    }

    const onChangeMemberComment = (value: string, index: number) => {
        updateMembersStateItem(index, { comment: { value } })
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
            const usernameStringList = usernamesSelector.map(({ username }) => username)
            const usernamesUnique = usernamesSelector.filter(({ username }, index) => {
                return usernameStringList.indexOf(username) === index
            })
            if (usernamesUnique.length) {
                await createDaoMember({ members: usernamesUnique })
            }

            // Completion staff
            setTransition({ form: false, success: false })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const sum = members.reduce((res, { allowance }) => res + allowance.value, 0)
        setReserve(dao.details.supply.reserve - sum)
    }, [dao.details.supply.reserve, members])

    return (
        <>
            <Transition
                show={transition.form}
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                beforeEnter={() => {
                    setMembers([emptyMemberItem])
                }}
                afterLeave={() => setTransition({ form: false, success: true })}
            >
                <h3 className="text-xl font-medium mb-4">Invite user to DAO</h3>
                <div className="mb-12">
                    {members.map(({ name, allowance, comment }, index) => (
                        <div key={index} className="mb-8">
                            <div className="mb-3">
                                <Input
                                    type="text"
                                    placeholder="GOSH username or email"
                                    value={name.value}
                                    onChange={(e) => {
                                        onChangeMemberName(e.target.value, index)
                                    }}
                                />

                                {name.validated.message && (
                                    <div
                                        className={classNames(
                                            'text-xs',
                                            name.validated.valid
                                                ? 'text-gray-7c8db5'
                                                : 'text-red-dd3a3a',
                                        )}
                                    >
                                        {name.validated.message}
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                <Input
                                    type="text"
                                    placeholder="Member allowance"
                                    value={allowance.value}
                                    onChange={(e) => {
                                        onChangeMemberAllowance(e.target.value, index)
                                    }}
                                />
                                <div className="text-xs text-gray-7c8db5">
                                    Available DAO reserve {reserve}
                                </div>

                                {allowance.validated.message && (
                                    <div
                                        className={classNames(
                                            'text-xs',
                                            allowance.validated.valid
                                                ? 'text-gray-7c8db5'
                                                : 'text-red-dd3a3a',
                                        )}
                                    >
                                        {allowance.validated.message}
                                    </div>
                                )}
                            </div>

                            <div>
                                <Textarea
                                    placeholder="Comment your decision"
                                    value={comment.value}
                                    onChange={(e) => {
                                        onChangeMemberComment(e.target.value, index)
                                    }}
                                />
                            </div>

                            <div className="text-right mt-2">
                                <button
                                    type="button"
                                    className="p-1 text-sm text-gray-7c8db5"
                                    onClick={() => onRemoveMember(index)}
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
                                    hasErrorsSelector ||
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
                    hasUsernames={!!usernamesSelector.length}
                    hasEmails={!!emailsSelector.length}
                />
            </Transition>
        </>
    )
}

export default DaoMemberForm