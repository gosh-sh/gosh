import { Field, Form, Formik } from 'formik'
import { useCallback, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import { FormikInput, FormikTextarea } from '../../components/Formik'
import { FormikSlider } from '../../components/Formik/FormikSlider'
import yup from '../../yup-extended'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import Chart from 'react-apexcharts'
import { debounce } from 'lodash'

type TFormValues = {
    name: string
    cost: number
    assign: number
    review: number
    manager: number
    lock: number
    vestingDuration: number
    vestingParts: number
    comment?: string
}

type TPair = {
    grant: number
    lock: number
}

type TStruct = {
    assign: TPair[]
    review: TPair[]
    manager: TPair[]
}

const TaskCreatePage = () => {
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const navigate = useNavigate()
    const [struct, setStruct] = useState<TStruct>({ assign: [], review: [], manager: [] })

    const getCalculatedStruct = (values: TFormValues) => {
        const struct: TStruct = { assign: [], review: [], manager: [] }
        const assign = Math.floor((values.cost * values.assign) / 100)
        const review = Math.floor((values.cost * values.review) / 100)
        const manager = Math.floor((values.cost * values.manager) / 100)

        if (!values.vestingDuration) {
            const lock = values.lock * 24 * 60 * 60

            struct.assign.push({ grant: assign, lock })
            struct.review.push({ grant: review, lock })
            struct.manager.push({ grant: manager, lock })
            console.debug('Simple', struct)
        } else {
            const lock = values.vestingDuration * 24 * 60 * 60

            const _assign = Math.ceil(assign / values.vestingParts)
            const _review = Math.ceil(review / values.vestingParts)
            const _manager = Math.ceil(manager / values.vestingParts)
            const _lock = Math.floor(lock / values.vestingParts)
            for (let i = 1; i <= values.vestingParts; i++) {
                if (i === 1 || (i > 1 && _assign * i <= assign)) {
                    struct.assign.push({ grant: _assign, lock: _lock * i })
                }
                if (i === 1 || (i > 1 && _review * i <= review)) {
                    struct.review.push({ grant: _review, lock: _lock * i })
                }
                if (i === 1 || (i > 1 && _manager * i <= manager)) {
                    struct.manager.push({ grant: _manager, lock: _lock * i })
                }
            }
            console.debug('Vesting', struct)
        }
        return struct
    }

    const updateStructState = useCallback(
        debounce((values: TFormValues) => {
            const _struct = getCalculatedStruct(values)
            setStruct(_struct)
        }, 500),
        [],
    )

    const onCreateTask = async (values: TFormValues) => {
        try {
            const _struct = getCalculatedStruct(values)
            await repository.adapter.createTask(values.name, _struct, values.comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <Formik
            initialValues={{
                name: '',
                cost: 0,
                assign: 60,
                review: 30,
                manager: 10,
                lock: 10,
                vestingDuration: 0,
                vestingParts: 1,
            }}
            validationSchema={yup.object().shape({
                name: yup.string().required(),
                cost: yup
                    .number()
                    .integer()
                    .positive()
                    .max(dao.details.supply.reserve)
                    .required(),
            })}
            onSubmit={onCreateTask}
        >
            {({ values, isSubmitting, setFieldValue }) => (
                <Form>
                    <h1 className="text-xl font-medium mb-10">
                        Distributing tokens for task
                    </h1>

                    <div className="w-1/3">
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
                        <div>
                            <Field
                                component={FormikInput}
                                label="Task cost"
                                placeholder="Task cost"
                                name="cost"
                                autoComplete="off"
                                disabled={isSubmitting}
                                help={`Available DAO reserve ${dao.details.supply.reserve}`}
                                onChange={(e: any) => {
                                    const cost = parseInt(e.target.value)
                                    if (!isNaN(cost)) {
                                        setFieldValue('cost', cost, true)
                                        updateStructState({ ...values, cost })
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
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Commit author for accepted merge"
                                        name="assign"
                                        min={1}
                                        inputProps={{ label: '%' }}
                                        onChange={(e: any) => {
                                            const assign = parseInt(e.target.value)
                                            setFieldValue('assign', assign, true)
                                            updateStructState({ ...values, assign })
                                        }}
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Code reviewer for accepted merge"
                                        name="review"
                                        min={1}
                                        inputProps={{ label: '%' }}
                                        onChange={(e: any) => {
                                            const review = parseInt(e.target.value)
                                            setFieldValue('review', review, true)
                                            updateStructState({ ...values, review })
                                        }}
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Manager for closed task"
                                        name="manager"
                                        min={1}
                                        inputProps={{ label: '%' }}
                                        onChange={(e: any) => {
                                            const manager = parseInt(e.target.value)
                                            setFieldValue('manager', manager, true)
                                            updateStructState({ ...values, manager })
                                        }}
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Lock period"
                                        name="lock"
                                        inputProps={{ label: ' days' }}
                                        onChange={(e: any) => {
                                            const lock = parseInt(e.target.value)
                                            setFieldValue('lock', lock, true)
                                            updateStructState({ ...values, lock })
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-14">
                        <h3 className="font-medium">Vesting</h3>
                        <div className="mt-6 border border-gray-e6edff rounded-xl p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Vesting period"
                                        name="vestingDuration"
                                        inputProps={{ label: ' days' }}
                                        onChange={(e: any) => {
                                            const vestingDuration = parseInt(
                                                e.target.value,
                                            )
                                            setFieldValue(
                                                'vestingDuration',
                                                vestingDuration,
                                                true,
                                            )
                                            updateStructState({
                                                ...values,
                                                vestingDuration,
                                            })
                                        }}
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Vesting parts"
                                        name="vestingParts"
                                        min={1}
                                        max={150}
                                        inputProps={{ label: '' }}
                                        onChange={(e: any) => {
                                            const vestingParts = parseInt(e.target.value)
                                            setFieldValue(
                                                'vestingParts',
                                                vestingParts,
                                                true,
                                            )
                                            updateStructState({ ...values, vestingParts })
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-14">
                        <h3 className="mb-4 font-medium">Payments</h3>
                        <table className="border-collapse">
                            <thead>
                                <tr className="text-sm text-gray-7c8db5 border-b-2 border-b-gray-e6edff">
                                    <th className="font-light py-1 px-2">Lock part</th>
                                    <th className="font-light py-1 px-2">Assigner</th>
                                    <th className="font-light py-1 px-2">Reviewer</th>
                                    <th className="font-light py-1 px-2">Manager</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from(
                                    new Array(
                                        values.vestingDuration ? values.vestingParts : 1,
                                    ),
                                ).map((_, index) => (
                                    <tr
                                        key={index}
                                        className="text-sm border-b border-b-gray-e6edff"
                                    >
                                        <td className="text-center py-1">{index + 1}</td>
                                        <td className="text-center py-1">
                                            {struct.assign[index]
                                                ? struct.assign[index].grant
                                                : 0}
                                        </td>
                                        <td className="text-center py-1">
                                            {struct.review[index]
                                                ? struct.review[index].grant
                                                : 0}
                                        </td>
                                        <td className="text-center py-1">
                                            {struct.manager[index]
                                                ? struct.manager[index].grant
                                                : 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* <Chart
                            options={{
                                chart: {
                                    id: 'vesting-chart',
                                },
                                xaxis: {
                                    categories: [1, 2, 3, 5, 6, 7, 8, 9, 10],
                                },
                            }}
                            series={[
                                {
                                    name: 'assign',
                                    data: [1, 1, 1, 1, 1, 1, 1, 1, 2, 3],
                                },
                            ]}
                            height={190}
                        /> */}
                    </div>

                    <div className="mt-14 w-2/3">
                        <div className="basis-5/12">
                            <Field
                                component={FormikTextarea}
                                label="Comment"
                                name="comment"
                                placeholder="Write a description of the rules of token distribution"
                            />
                        </div>
                        <div className="mt-6">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Create task and start proposal
                            </Button>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default TaskCreatePage
