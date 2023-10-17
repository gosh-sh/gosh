import { useCallback } from 'react'
import { Dialog, Popover } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import AsyncSelect from 'react-select/async'
import CreatableSelect from 'react-select/creatable'
import { useCreateMilestone, useDao } from '../../../hooks/dao.hooks'
import { useDaoRepositoryList } from '../../../hooks/repository.hooks'
import { BaseField, FormikInput, FormikSlider } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { Select2ClassNames } from '../../../../helpers'
import { UserSelect } from '../../UserSelect'
import { getSystemContract } from '../../../blockchain/helpers'
import { ModalCloseButton } from '../../../../components/Modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import { useNavigate } from 'react-router-dom'
import yup from '../../../yup-extended'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'

type TFormValues = {
    name: string
    managerUsername: string
    managerReward: string
    repository: string
    budget: string
    lock: number
    vesting: number
    tags?: string[]
}

const MilestoneCreateModal = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const repositories = useDaoRepositoryList({ initialize: true })
    const { createMilestone } = useCreateMilestone()

    const getRepositoryOptions = useCallback(
        async (input: string) => {
            const options: any[] = []

            const query = await getSystemContract().getRepository({
                path: `${dao.details.name}/${input}`,
            })
            if (await query.isDeployed()) {
                options.push({ label: input, value: input })
            }

            return options
        },
        [dao.details.name],
    )

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onCreateMilestone = async (values: TFormValues) => {
        try {
            const { eventaddr } = await createMilestone({
                reponame: values.repository,
                taskname: values.name,
                manager: {
                    username: values.managerUsername,
                    reward: parseInt(values.managerReward),
                },
                budget: parseInt(values.budget),
                lock: values.lock,
                vesting: values.vesting,
                tags: values.tags,
            })
            onModalReset()
            navigate(`/o/${dao.details.name}/events/${eventaddr}`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
            <Formik
                initialValues={{
                    name: '',
                    repository: '',
                    managerUsername: '',
                    managerReward: '',
                    budget: '',
                    lock: 0,
                    vesting: 0,
                }}
                validationSchema={yup.object().shape({
                    name: yup.string().required(),
                    repository: yup.string().required(),
                    managerUsername: yup.string().required(),
                    managerReward: yup
                        .number()
                        .min(1)
                        .max(dao.details.supply?.reserve || 0)
                        .required(),
                    budget: yup
                        .number()
                        .min(1)
                        .max(dao.details.supply?.reserve || 0)
                        .required(),
                    lock: yup.number().min(0).max(12),
                    vesting: yup.number().min(0).max(60),
                    tags: yup.array().of(yup.string()).max(3),
                })}
                onSubmit={onCreateMilestone}
                enableReinitialize
            >
                {({ isSubmitting, setFieldValue, values }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />
                        <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                            Create milestone
                        </Dialog.Title>

                        <div className="mb-4">
                            <Field
                                component={FormikInput}
                                name="name"
                                placeholder="Write milestone name"
                                autoComplete="off"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="mb-4">
                            <Field name="managerUsername" component={BaseField}>
                                <UserSelect
                                    placeholder="Manager"
                                    isDisabled={isSubmitting}
                                    onChange={(option) => {
                                        const name = option?.value.name || ''
                                        setFieldValue('managerUsername', name, true)
                                    }}
                                />
                            </Field>
                        </div>
                        <div className="mb-4">
                            <Field
                                component={FormikInput}
                                name="managerReward"
                                placeholder="Manager reward"
                                autoComplete="off"
                                disabled={isSubmitting}
                                help={`${dao.details.supply?.reserve.toLocaleString()} available`}
                            />
                        </div>
                        <div className="mb-4">
                            <Field name="repository" component={BaseField}>
                                <AsyncSelect
                                    classNames={Select2ClassNames}
                                    isClearable
                                    isDisabled={isSubmitting || repositories.isFetching}
                                    isLoading={repositories.isFetching}
                                    cacheOptions
                                    defaultOptions={repositories.items.map(
                                        ({ name }) => ({
                                            label: name,
                                            value: name,
                                        }),
                                    )}
                                    loadOptions={getRepositoryOptions}
                                    placeholder="Repository"
                                    onChange={(option) => {
                                        const value = option?.value || ''
                                        setFieldValue('repository', value, true)
                                    }}
                                />
                            </Field>
                        </div>
                        <div className="relative mb-4 flex flex-nowrap gap-3">
                            <div className="grow">
                                <Field
                                    component={FormikInput}
                                    name="budget"
                                    placeholder="Budget"
                                    autoComplete="off"
                                    disabled={isSubmitting}
                                    help={`${dao.details.supply?.reserve.toLocaleString()} available`}
                                />
                            </div>
                            <Popover>
                                {({ open }) => (
                                    <>
                                        <Popover.Button
                                            as={Button}
                                            type="button"
                                            variant="outline-secondary"
                                        >
                                            {values.lock || values.vesting
                                                ? `${values.lock}mo, ${values.vesting}mo`
                                                : 'Vesting'}
                                            <FontAwesomeIcon
                                                icon={faChevronDown}
                                                size="sm"
                                                className={classNames(
                                                    'ml-2 transition-all duration-200',
                                                    open ? 'rotate-180' : 'rotate-0',
                                                )}
                                            />
                                        </Popover.Button>
                                        <Popover.Panel className="absolute top-full left-0 w-full max-w-sm z-1 translate-y-1">
                                            <div className="p-6 bg-white rounded-xl border border-gray-e6edff">
                                                <h3 className="font-medium mb-6">
                                                    Select vesting and lock for tokens
                                                </h3>
                                                <div className="mb-7">
                                                    <Field
                                                        component={FormikSlider}
                                                        label="Lock period (cliff)"
                                                        name="lock"
                                                        inputProps={{ label: ' mo' }}
                                                        max={12}
                                                    />
                                                </div>
                                                <div>
                                                    <Field
                                                        component={FormikSlider}
                                                        label="Vesting period"
                                                        name="vesting"
                                                        inputProps={{ label: ' mo' }}
                                                        max={60}
                                                    />
                                                </div>
                                            </div>
                                        </Popover.Panel>
                                    </>
                                )}
                            </Popover>
                        </div>
                        <div className="mb-4">
                            <Field name="tags" component={BaseField}>
                                <CreatableSelect
                                    isMulti
                                    isClearable
                                    openMenuOnClick={false}
                                    classNames={Select2ClassNames}
                                    placeholder="Tags (up to 3)"
                                    isDisabled={isSubmitting}
                                    onChange={(option) => {
                                        const items = option.map(
                                            (item: any) => item.value,
                                        )
                                        setFieldValue('tags', items, true)
                                    }}
                                />
                            </Field>
                        </div>
                        <div className="text-center">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Create milestone
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

export { MilestoneCreateModal }
