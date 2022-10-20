import { Form, Formik } from 'formik'
import * as Yup from 'yup'
import { classNames } from 'react-gosh'
import { TPushCallbackParams } from 'react-gosh/dist/types/repo.types'
import CommitFields from './CommitFileds'

type TCommitFormValues = {
    title: string
    message?: string
    tags?: string
    deleteBranch?: boolean
}

type TCommitFormProps = {
    className?: string
    initialValues: TCommitFormValues
    validationSchema?: object
    extraButtons?: any
    progress?: TPushCallbackParams
    onSubmit(values: TCommitFormValues): Promise<void>
}

const BranchCommitForm = (props: TCommitFormProps) => {
    const {
        className,
        initialValues,
        validationSchema,
        extraButtons,
        progress,
        onSubmit,
    } = props

    return (
        <div className={classNames('border rounded px-4 py-3', className)}>
            <Formik
                initialValues={initialValues}
                onSubmit={onSubmit}
                validationSchema={Yup.object().shape({
                    title: Yup.string().required('Field is required'),
                    ...validationSchema,
                })}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <CommitFields
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

export default BranchCommitForm
