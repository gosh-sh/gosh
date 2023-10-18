import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import yup from '../../yup-extended'
import { useDaoRepositoryList } from '../../hooks/repository.hooks'
import { useDao, useCreateTask } from '../../hooks/dao.hooks'
import {
    BaseField,
    FormikInput,
    FormikSlider,
    FormikTextarea,
} from '../../../components/Formik'
import { Button } from '../../../components/Form'
import AsyncSelect from 'react-select/async'
import { Select2ClassNames } from '../../../helpers'
import { getSystemContract } from '../../blockchain/helpers'
import { useCallback } from 'react'
import CreatableSelect from 'react-select/creatable'

type TFormValues = {
    repository: string
    name: string
    cost: number
    assign: number
    review: number
    manager: number
    lock: number
    vesting: number
    tags?: string[]
    comment?: string
}

const TaskCreatePage = () => {
    const navigate = useNavigate()
    const dao = useDao()
    const repositories = useDaoRepositoryList({ initialize: true })
    const { createTask, getTokenAmount } = useCreateTask()

    const getRepositoryOptions = useCallback(
        async (input: string) => {
            const options: any[] = []

            const query = await getSystemContract().getRepository({
                path: `${dao.details.name}/${input}`,
            })
            if (await query.isDeployed()) {
                options.push({
                    label: input,
                    value: input,
                })
            }

            return options
        },
        [dao.details.name],
    )

    const onCreateTask = async (values: TFormValues) => {
        try {
            const { repository, name, ...rest } = values
            const { eventaddr } = await createTask({
                reponame: repository,
                taskname: name,
                ...rest,
            })
            navigate(`/o/${dao.details.name}/events/${eventaddr || ''}`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Formik
            initialValues={{
                repository: '',
                name: '',
                cost: 0,
                assign: 60,
                review: 30,
                manager: 10,
                lock: 0,
                vesting: 0,
                comment: '',
                tags: [],
            }}
            validationSchema={yup.object().shape({
                repository: yup.string().required(),
                name: yup.string().required(),
                tags: yup.array().of(yup.string()).max(3),
                cost: yup
                    .number()
                    .integer()
                    .positive()
                    .max(dao.details.supply?.reserve || 0)
                    .required(),
                assign: yup
                    .number()
                    .test('test-percent', 'Percent sum should be 100%', function (value) {
                        if (value + this.parent.review + this.parent.manager !== 100) {
                            return false
                        }
                        return true
                    }),
                review: yup
                    .number()
                    .test('test-percent', 'Percent sum should be 100%', function (value) {
                        if (value + this.parent.assign + this.parent.manager !== 100) {
                            return false
                        }
                        return true
                    }),
                manager: yup
                    .number()
                    .test('test-percent', 'Percent sum should be 100%', function (value) {
                        if (value + this.parent.assign + this.parent.review !== 100) {
                            return false
                        }
                        return true
                    }),
                comment: yup.string().required(),
            })}
            enableReinitialize
            onSubmit={onCreateTask}
        >
            {({ values, isSubmitting, setFieldValue }) => (
                <Form>
                    <h1 className="text-3xl font-medium mb-10">New task</h1>
                    <div className="w-1/3">
                        <div className="mb-4">
                            <Field
                                name="repository"
                                component={BaseField}
                                label="Repository"
                            >
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
                                    placeholder="Select repository"
                                    onChange={(option) => {
                                        const value = option?.value || ''
                                        setFieldValue('repository', value, true)
                                    }}
                                />
                            </Field>
                        </div>
                        <div className="mb-4">
                            <Field
                                component={FormikInput}
                                label="Task name"
                                name="name"
                                placeholder="Task name"
                                autoComplete="off"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="mb-4">
                            <Field name="tags" component={BaseField} label="Task tags">
                                <CreatableSelect
                                    isMulti
                                    isClearable
                                    openMenuOnClick={false}
                                    classNames={Select2ClassNames}
                                    placeholder="Task tags (up to 3 tags)"
                                    isDisabled={isSubmitting}
                                    onChange={(option) => {
                                        const items = option.map(
                                            (item: any) => item.value,
                                        )
                                        setFieldValue('tags', items, true)
                                    }}
                                    test-id="input-dao-tags"
                                />
                            </Field>
                        </div>
                    </div>
                    <hr className="my-12 bg-gray-e6edff" />
                    <div className="w-1/3">
                        <div>
                            <Field
                                component={FormikInput}
                                label="Task cost"
                                placeholder="Task cost"
                                name="cost"
                                autoComplete="off"
                                disabled={isSubmitting}
                                help={`Available DAO reserve ${dao.details.supply?.reserve.toLocaleString()}`}
                                onChange={(e: any) => {
                                    const cost = parseInt(e.target.value)
                                    if (!isNaN(cost)) {
                                        setFieldValue('cost', cost, true)
                                        // updateStructState({ ...values, cost })
                                    } else {
                                        setFieldValue('cost', e.target.value, true)
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="mt-14">
                        <h3 className="font-medium">Default task tokens distribution</h3>
                        <div className="text-sm text-gray-7c8db5">
                            If a pull request request is attached to a task, tokens will
                            be distributed between
                        </div>
                        <div className="mt-6 border border-gray-e6edff rounded-xl p-6">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Commit author for accepted merge"
                                        name="assign"
                                        inputProps={{ label: '%' }}
                                        help={
                                            <span>
                                                Assigner part:{' '}
                                                {getTokenAmount(
                                                    values.cost,
                                                    values.assign,
                                                )}
                                            </span>
                                        }
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Code reviewer for accepted merge"
                                        name="review"
                                        inputProps={{ label: '%' }}
                                        help={
                                            <span>
                                                Reviewer part:{' '}
                                                {getTokenAmount(
                                                    values.cost,
                                                    values.review,
                                                )}
                                            </span>
                                        }
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Manager for closed task"
                                        name="manager"
                                        inputProps={{ label: '%' }}
                                        help={
                                            <span>
                                                Manager part:{' '}
                                                {getTokenAmount(
                                                    values.cost,
                                                    values.manager,
                                                )}
                                            </span>
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-14">
                        <h3 className="font-medium">Vesting and lock</h3>
                        <div className="mt-6 border border-gray-e6edff rounded-xl p-6">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Lock period (cliff)"
                                        name="lock"
                                        inputProps={{ label: ' mo' }}
                                        max={12}
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Vesting period"
                                        name="vesting"
                                        inputProps={{ label: ' mo' }}
                                        max={60}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr className="my-12 bg-gray-e6edff" />
                    <div className="w-full lg:w-1/2">
                        <div>
                            <Field
                                component={FormikTextarea}
                                label="Comment"
                                name="comment"
                                placeholder="Write a description of the rules of token distribution"
                                maxRows={5}
                            />
                        </div>
                        <div className="mt-6">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Create task and start event
                            </Button>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default TaskCreatePage
