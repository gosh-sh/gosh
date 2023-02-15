import { Field } from 'formik'
import { classNames, useTaskList } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { TPushProgress } from 'react-gosh'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../Form'
import {
    FormikCheckbox,
    FormikInput,
    FormikSelect,
    FormikTextarea,
} from '../../../Formik'
import CommitProgress from '../../CommitProgress'

type TCommitFields_1_1_0Props = {
    dao: IGoshDaoAdapter
    repository: string
    className?: string
    isSubmitting: boolean
    urlBack?: string
    extraButtons?: any
    progress?: TPushProgress
}

const CommitFields_1_1_0 = (props: TCommitFields_1_1_0Props) => {
    const { dao, repository, className, isSubmitting, urlBack, extraButtons, progress } =
        props
    const navigate = useNavigate()
    const tasks = useTaskList(dao, { repository, perPage: 0 })

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl py-5', className)}
        >
            <div
                className={classNames(
                    'flex flex-wrap justify-between',
                    'divide-x divide-gray-e6edff py-5',
                )}
            >
                <div className="grow px-5">
                    <div>
                        <Field
                            name="title"
                            component={FormikInput}
                            autoComplete="off"
                            placeholder="Commit title"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mt-6">
                        <Field
                            name="message"
                            component={FormikTextarea}
                            label="Commit description (optional)"
                            placeholder="Commit description"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mt-6">
                        <Field
                            name="tags"
                            component={FormikInput}
                            label="Commit tags (optional)"
                            placeholder="Commit tags"
                            help="Enter a space after each tag"
                            autoComplete="off"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
                <div className="basis-5/12 px-5">
                    <div>
                        <Field
                            name="task"
                            component={FormikSelect}
                            label="Select task (optional)"
                            disabled={isSubmitting}
                        >
                            <option value="">Select task</option>
                            {tasks.items.map(({ name }, index) => (
                                <option value={name} key={index}>
                                    {name}
                                </option>
                            ))}
                        </Field>
                    </div>
                    <div className="mt-6">
                        <Field
                            name="assigners"
                            component={FormikInput}
                            label="Assigner(s)"
                            placeholder="Assigners"
                            help="Enter a space after each username"
                            autoComplete="off"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mt-6">
                        <Field
                            name="reviewers"
                            component={FormikInput}
                            label="Reviewer(s)"
                            placeholder="Reviewers"
                            help="Enter a space after each username"
                            autoComplete="off"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mt-6">
                        <Field
                            name="managers"
                            component={FormikInput}
                            label="Manager(s)"
                            placeholder="Managers"
                            help="Enter a space after each username"
                            autoComplete="off"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
            </div>

            <div
                className={classNames(
                    'border-t border-gray-e6edff px-5 pt-5',
                    'flex flex-wrap items-center gap-10',
                )}
            >
                <div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                        >
                            Commit changes
                        </Button>
                        {urlBack && (
                            <Button
                                className={classNames(
                                    '!bg-white text-red-ff3b30 border border-red-ff3b30',
                                    'hover:!bg-red-ff3b30/5 hover:text-red-ff3b30',
                                    'disabled:!border-gray-e6edff',
                                )}
                                disabled={isSubmitting}
                                onClick={() => navigate(urlBack)}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>

                <div>
                    <Field
                        name="isPullRequest"
                        component={FormikCheckbox}
                        disabled={isSubmitting}
                        inputProps={{
                            label: 'Create proposal',
                        }}
                    />
                </div>

                {extraButtons && <div>{extraButtons}</div>}
            </div>

            {isSubmitting && progress && (
                <div className="mt-6 px-5">
                    <CommitProgress {...progress} />
                </div>
            )}
        </div>
    )
}

export default CommitFields_1_1_0
