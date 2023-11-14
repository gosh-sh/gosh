import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import classNames from 'classnames'
import {
    ErrorMessage,
    Field,
    FieldArray,
    FieldArrayRenderProps,
    Form,
    Formik,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import AsyncSelect from 'react-select/async'
import { AppConfig } from '../../../appconfig'
import { Button } from '../../../components/Form'
import { BaseField } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { Select2ClassNames } from '../../../helpers'
import { useUser } from '../../hooks/user.hooks'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'

type TFormParticipant = { dao_name: string; dao_version: string; repo_names: string[] }

type TFormValues = {
    participants: TFormParticipant[]
}

type TParticipantsModalProps = {
    onSubmit(values: { dao_name: string; repo_name: string }[]): Promise<void>
}

const getRepositoryOptions = async (params: {
    participant: TFormParticipant
    input: string
}) => {
    const { participant } = params
    const input = params.input.toLowerCase()
    const options: any[] = []

    const sc = AppConfig.goshroot.getSystemContract(participant.dao_version)
    const query = await sc.getRepository({ path: `${participant.dao_name}/${input}` })
    if (await query.isDeployed()) {
        options.push({
            label: input,
            value: {
                name: input,
                address: query.address,
            },
        })
    }

    return options
}

const HackathonParticipantsModal = (props: TParticipantsModalProps) => {
    const { onSubmit } = props

    const onFormSubmit = async (values: TFormValues) => {
        try {
            const items: { dao_name: string; repo_name: string }[] = []
            for (const item of values.participants) {
                const group = item.repo_names.map((repo_name) => ({
                    dao_name: item.dao_name,
                    repo_name,
                }))
                items.push(...group)
            }
            await onSubmit(items)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
            <Formik
                initialValues={{ participants: [] }}
                validationSchema={yup.object().shape({
                    participants: yup
                        .array()
                        .of(
                            yup.object().shape({
                                dao_name: yup.string().required(),
                                repo_names: yup
                                    .array()
                                    .of(yup.string().required())
                                    .min(1),
                            }),
                        )
                        .min(1),
                })}
                onSubmit={onFormSubmit}
            >
                {({ isSubmitting, errors, values }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />

                        <h1 className="text-xl font-medium">Add participants</h1>

                        {typeof errors.participants === 'string' && (
                            <ErrorMessage
                                component="div"
                                name="participants"
                                className="text-xs text-red-ff3b30 mt-1"
                            />
                        )}
                        <FieldArray name="participants" component={FieldArrayForm} />

                        <div className="mt-6 text-center">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Submit applications
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
    const { form, remove, push } = props as FieldArrayRenderProps
    const values = form.values as TFormValues
    const { user } = useUser()

    const onDaoNameChange = (option: any, index: number) => {
        const name = option?.value.name || ''
        const version = option?.value.version || ''
        form.setFieldValue(`participants.${index}.dao_name`, name, true)
        form.setFieldValue(`participants.${index}.dao_version`, version, true)
        form.setFieldValue(`participants.${index}.repo_names`, [], true)
    }

    const onRepoNameChange = (option: any, index: number) => {
        const names: string[] = option.map((item: any) => item.value.name)
        form.setFieldValue(`participants.${index}.repo_names`, names, true)
    }

    return (
        <>
            <div className="flex flex-col divide-y divide-gray-e6edff">
                <AnimatePresence>
                    {values.participants.map((_, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            exit={{ opacity: 0, transition: { duration: 0.4 } }}
                            className={classNames(
                                'flex items-center gap-x-6 py-3',
                                index === 0 ? 'mt-4' : null,
                            )}
                        >
                            <div className="grow">
                                <div className="mb-2">
                                    <Field
                                        name={`participants.${index}.dao_name`}
                                        component={BaseField}
                                    >
                                        <UserSelect
                                            placeholder="DAO name"
                                            isDisabled={form.isSubmitting}
                                            searchUser={false}
                                            searchDaoGlobal
                                            searchDaoIsMember={user.profile}
                                            onChange={(option) => {
                                                onDaoNameChange(option, index)
                                            }}
                                        />
                                    </Field>
                                    <ErrorMessage
                                        className="text-xs text-red-ff3b30 mt-0.5"
                                        component="div"
                                        name={`participants.${index}.dao_name`}
                                    />
                                </div>
                                <div>
                                    <Field
                                        name={`participants.${index}.dao_name`}
                                        component={BaseField}
                                    >
                                        <AsyncSelect
                                            classNames={Select2ClassNames}
                                            isClearable
                                            isMulti
                                            isDisabled={
                                                form.isSubmitting ||
                                                !values.participants[index].dao_name
                                            }
                                            cacheOptions={false}
                                            defaultOptions={false}
                                            loadOptions={(input) => {
                                                return getRepositoryOptions({
                                                    participant:
                                                        values.participants[index],
                                                    input,
                                                })
                                            }}
                                            formatOptionLabel={(data) => (
                                                <div>{data.label}</div>
                                            )}
                                            placeholder="Select one or multiple repositories"
                                            onChange={(option) => {
                                                onRepoNameChange(option, index)
                                            }}
                                        />
                                    </Field>
                                    <ErrorMessage
                                        className="text-xs text-red-ff3b30 mt-0.5"
                                        component="div"
                                        name={`participants.${index}.repo_names`}
                                    />
                                </div>
                            </div>

                            <div className="text-right">
                                <Button
                                    type="button"
                                    variant="custom"
                                    className="!p-1"
                                    disabled={form.isSubmitting}
                                    onClick={() => remove(index)}
                                >
                                    <FontAwesomeIcon icon={faTimes} size="xl" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="mt-6">
                <Button
                    type="button"
                    variant="custom"
                    size="sm"
                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                    disabled={form.isSubmitting}
                    onClick={() => push('0')}
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add application from DAO
                </Button>
            </div>
        </>
    )
}

export { HackathonParticipantsModal }
