import { Field, Form, Formik } from 'formik'
import { classNames } from 'react-gosh'
import { TPushProgress } from 'react-gosh/dist/types/repo.types'
import { FormikInput, FormikTextarea } from '../Formik'
import { Button } from '../Form'
import CommitProgress from './CommitProgress'
import yup from '../../yup-extended'

type TCommitFormValues = {
    title: string
    message?: string
    tags?: string
    deleteBranch?: boolean
    task?: string
    review?: string
    manager?: string
}

type TCommitFormProps = {
    className?: string
    initialValues: TCommitFormValues
    validationSchema?: object
    extraButtons?: any
    progress?: TPushProgress
    onSubmit(values: TCommitFormValues): Promise<void>
}

const BranchCommitTaskForm = (props: TCommitFormProps) => {
    const { className, initialValues, validationSchema, progress, onSubmit } = props

    return (
        <div
            className={classNames(
                'border border-gray-e6edff rounded-xl px-4 py-3',
                className,
            )}
        >
            <Formik
                initialValues={initialValues}
                onSubmit={onSubmit}
                validationSchema={yup.object().shape({
                    title: yup.string().required('Field is required'),
                    ...validationSchema,
                })}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <h3 className="text-lg font-medium mb-2">Commit data</h3>
                        <div className="flex flex-wrap gap-4 justify-between">
                            <div className="basis-6/12">
                                <div>
                                    <Field
                                        name="title"
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Commit title"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="mt-3">
                                    <Field
                                        name="message"
                                        component={FormikTextarea}
                                        placeholder="Commit optional description"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="mt-3">
                                    <Field
                                        name="tags"
                                        component={FormikInput}
                                        help="Space separated tags"
                                        placeholder="Commit tags"
                                        autoComplete="off"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="basis-5/12">
                                <div>
                                    <Field
                                        name="task"
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Task name"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="mt-3">
                                    <Field
                                        name="review"
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Reviewer"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="mt-3">
                                    <Field
                                        name="manager"
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Manager"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap mt-4 items-center gap-3">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                            >
                                Commit changes
                            </Button>
                        </div>

                        {isSubmitting && progress && (
                            <div className="mt-6">
                                <CommitProgress {...progress} />
                            </div>
                        )}
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default BranchCommitTaskForm
