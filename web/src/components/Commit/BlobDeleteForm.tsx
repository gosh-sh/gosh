import { Form, Formik } from 'formik'
import { classNames, TDao, TPushProgress } from 'react-gosh'
import RepoBreadcrumbs from '../Repo/Breadcrumbs'
import { useNavigate } from 'react-router-dom'
import BlobDiffPreview from '../Blob/DiffPreview'
import yup from '../../yup-extended'
import { Button } from '../Form'
import { CommitFields } from './CommitFields/CommitFields'

export type TBlobDeleteFormValues = {
    title: string
    message?: string
    tags?: string
    task?: string
    reviewers?: string
    manager?: string
    isPullRequest?: boolean
}

type TBlobDeleteFormProps = {
    className?: string
    dao: TDao
    repo: string
    branch: string
    treepath: string
    content?: string | Buffer
    initialValues: TBlobDeleteFormValues
    validationSchema?: object
    extraButtons?: any
    urlBack?: string
    progress?: TPushProgress
    onSubmit(values: TBlobDeleteFormValues): Promise<void>
}

const BlobDeleteForm = (props: TBlobDeleteFormProps) => {
    const {
        className,
        dao,
        repo,
        branch,
        treepath,
        content,
        initialValues,
        validationSchema,
        extraButtons,
        urlBack,
        progress,
        onSubmit,
    } = props
    const navigate = useNavigate()

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
                        <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                            <div className="flex flex-wrap items-baseline gap-y-2">
                                <RepoBreadcrumbs
                                    daoName={dao.name}
                                    repoName={repo}
                                    branchName={branch}
                                    pathName={treepath}
                                    isBlob={true}
                                />
                                <span className="mx-2">in</span>
                                <span>{branch}</span>
                            </div>

                            {urlBack && (
                                <Button
                                    disabled={isSubmitting}
                                    onClick={() => navigate(urlBack)}
                                >
                                    Discard changes
                                </Button>
                            )}
                        </div>

                        <div className="mt-5 relative overflow-hidden">
                            <BlobDiffPreview
                                filename={treepath}
                                original={content}
                                modified=""
                                isDiffLoaded
                                getDiff={() => {}}
                            />
                        </div>

                        <CommitFields
                            dao={dao}
                            className="mt-4"
                            isSubmitting={isSubmitting}
                            urlBack={urlBack}
                            extraButtons={extraButtons}
                            progress={progress}
                        />
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export { BlobDeleteForm }
