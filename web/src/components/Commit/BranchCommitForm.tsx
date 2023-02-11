import { Form, Formik } from 'formik'
import { classNames, TDao } from 'react-gosh'
import { TPushProgress } from 'react-gosh/dist/types/repo.types'
import yup from '../../yup-extended'
import { CommitFields } from './CommitFields/CommitFields'

export type TBranchCommitFormValues = {
    title: string
    message?: string
    tags?: string
    deleteSrcBranch?: boolean
    task?: string
    reviewers?: string
    manager?: string
    isPullRequest?: boolean
}

type TBranchCommitFormProps = {
    className?: string
    dao: TDao
    initialValues: TBranchCommitFormValues
    validationSchema?: object
    extraButtons?: any
    progress?: TPushProgress
    onSubmit(values: TBranchCommitFormValues): Promise<void>
}

const BranchCommitForm = (props: TBranchCommitFormProps) => {
    const {
        className,
        dao,
        initialValues,
        validationSchema,
        extraButtons,
        progress,
        onSubmit,
    } = props

    const getInitialValues = () => {
        const version_1_1_0 = {
            task: '',
            reviewers: '',
            manager: '',
        }
        return {
            ...initialValues,
            ...(dao.version === '1.1.0' ? version_1_1_0 : {}),
        }
    }

    const getValidationSchema = () => {
        const version_1_1_0 = {
            task: yup.string(),
            reviewers: yup
                .string()
                .test(
                    'check-reviewer',
                    'Reviewer is required if task was selected',
                    function (value) {
                        const { path, createError } = this
                        if (this.parent.task && !value) {
                            return createError({ path })
                        }
                        return true
                    },
                ),
            manager: yup
                .string()
                .test(
                    'check-manager',
                    'Manager is required if task was selected',
                    function (value) {
                        if (this.parent.task && !value) {
                            return false
                        }
                        return true
                    },
                ),
        }

        return yup.object().shape({
            title: yup.string().required('Field is required'),
            ...validationSchema,
            ...(dao.version === '1.1.0' ? version_1_1_0 : {}),
        })
    }

    return (
        <div className={classNames(className)}>
            <Formik
                initialValues={getInitialValues()}
                validationSchema={getValidationSchema()}
                onSubmit={onSubmit}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <CommitFields
                            dao={dao}
                            isSubmitting={isSubmitting}
                            extraButtons={extraButtons}
                            progress={progress}
                        />
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export { BranchCommitForm }
