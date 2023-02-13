import { Field, Form, Formik } from 'formik'
import { GoshError } from 'react-gosh'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import { FormikInput, FormikTextarea } from '../../components/Formik'
import { FormikSlider } from '../../components/Formik/FormikSlider'
import yup from '../../yup-extended'
import { TRepoLayoutOutletContext } from '../RepoLayout'

type TFormValues = {
    name: string
    cost: number
    assign: number
    review: number
    manager: number
    lock: number
    vesting: number
    tags?: string
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

    const getTokenAmount = (cost: number, percent: number) => {
        return Math.round((cost * percent) / 100)
    }

    const getVestingPart = (calculated: TPair[], parts: number, total: number) => {
        const sum = calculated.reduce((_sum, num) => _sum + num.grant, 0)
        const part = Math.ceil((total - sum) / parts)
        const value = sum + part <= total ? part : total - (sum + part)
        return value > 0 ? value : 0
    }

    const getCalculatedStruct = (values: TFormValues) => {
        const { cost, assign, review, manager, lock, vesting } = values

        const lockSec = lock * 30 * 24 * 60 * 60
        const assignTokens = getTokenAmount(cost, assign)
        const reviewTokens = getTokenAmount(cost, review)
        const managerTokens = getTokenAmount(cost, manager)

        const struct: TStruct = { assign: [], review: [], manager: [] }
        if (!vesting) {
            struct.assign.push({ grant: assignTokens, lock: lockSec })
            struct.review.push({ grant: reviewTokens, lock: lockSec })
            struct.manager.push({ grant: managerTokens, lock: lockSec })
            return struct
        }

        // Vesting calculate
        for (let i = 1; i <= vesting; i++) {
            const vLock = lockSec + i * 30 * 24 * 60 * 60
            const parts = i === 1 ? vesting : vesting - i + 1

            const vAssign = getVestingPart(struct.assign, parts, assignTokens)
            struct.assign.push({ grant: vAssign, lock: vLock })

            const vReview = getVestingPart(struct.review, parts, reviewTokens)
            struct.review.push({ grant: vReview, lock: vLock })

            const vManager = getVestingPart(struct.manager, parts, managerTokens)
            struct.manager.push({ grant: vManager, lock: vLock })
        }
        return struct
    }

    const onCreateTask = async (values: TFormValues) => {
        try {
            // Get payments matrix
            const _struct = getCalculatedStruct(values)
            console.debug('Struct', _struct)

            // Validate payments matrix
            const errTitle = 'Incorrect vesting schema'
            const errMessage = `has not enough tokens to pay all periods`
            if (_struct.assign.slice(-1)[0].grant === 0) {
                throw new GoshError(errTitle, `Assigner ${errMessage}`)
            }
            if (_struct.review.slice(-1)[0].grant === 0) {
                throw new GoshError(errTitle, `Reviewer ${errMessage}`)
            }
            if (_struct.manager.slice(-1)[0].grant === 0) {
                throw new GoshError(errTitle, `Manager ${errMessage}`)
            }

            // Tags
            const tags = values.tags ? values.tags.trim().split(' ') : []

            // Create task
            await repository.adapter.createTask({
                name: values.name,
                config: _struct,
                tags,
                comment: values.comment,
            })
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
                lock: 0,
                vesting: 0,
                comment: '',
                tags: '',
            }}
            validationSchema={yup.object().shape({
                name: yup.string().required(),
                cost: yup
                    .number()
                    .integer()
                    .positive()
                    .max(dao.details.supply.reserve)
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
                        <div className="mb-4">
                            <Field
                                component={FormikInput}
                                label="Task tags (optional)"
                                name="tags"
                                placeholder="Task tags"
                                autoComplete="off"
                                disabled={isSubmitting}
                                help="Enter a space after each tag"
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
                        <h3 className="font-medium">Vesting</h3>
                        <div className="mt-6 border border-gray-e6edff rounded-xl p-6">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Vesting period"
                                        name="vesting"
                                        inputProps={{ label: ' mo' }}
                                        max={60}
                                    />
                                </div>
                                <div className="basis-5/12">
                                    <Field
                                        component={FormikSlider}
                                        label="Lock period (cliff)"
                                        name="lock"
                                        inputProps={{ label: ' mo' }}
                                        max={12}
                                    />
                                </div>
                            </div>
                        </div>
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
