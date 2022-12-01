import { Form, Formik } from 'formik'
import * as Yup from 'yup'
import { classNames, TPushProgress } from 'react-gosh'
import RepoBreadcrumbs from '../Repo/Breadcrumbs'
import { useNavigate } from 'react-router-dom'
import BlobDiffPreview from '../Blob/DiffPreview'
import CommitFields from './CommitFileds'

type TBlobDeleteFormValues = {
    title: string
    message?: string
    tags?: string
}

type TBlobDeleteFormProps = {
    className?: string
    dao: string
    repo: string
    branch: string
    treepath: string
    content?: string | Buffer
    initialValues: TBlobDeleteFormValues
    validationSchema?: object
    isDisabled?: boolean
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
        isDisabled,
        extraButtons,
        urlBack,
        progress,
        onSubmit,
    } = props

    const navigate = useNavigate()

    return (
        <div className={classNames(className)}>
            <Formik
                initialValues={initialValues}
                validationSchema={Yup.object().shape({
                    title: Yup.string().required('Field is required'),
                    ...validationSchema,
                })}
                onSubmit={onSubmit}
            >
                {({ values, isSubmitting }) => (
                    <Form className="px-4 sm:px-7">
                        <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                            <div className="flex flex-wrap items-baseline gap-y-2">
                                <RepoBreadcrumbs
                                    daoName={dao}
                                    repoName={repo}
                                    branchName={branch}
                                    pathName={treepath}
                                    isBlob={true}
                                />
                                <span className="mx-2">in</span>
                                <span>{branch}</span>
                            </div>

                            {urlBack && (
                                <button
                                    className="btn btn--body px-3 py-1.5 !text-sm !font-normal text-center w-full sm:w-auto"
                                    disabled={isSubmitting}
                                    onClick={() => navigate(urlBack)}
                                >
                                    Discard changes
                                </button>
                            )}
                        </div>

                        <div className="mt-5 border rounded overflow-hidden">
                            <BlobDiffPreview
                                filename={treepath}
                                original={content}
                                modified=""
                                isDiffLoaded
                                getDiff={() => {}}
                            />
                        </div>

                        <CommitFields
                            className="mt-4"
                            isSubmitting={isSubmitting}
                            isDisabled={isDisabled}
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

export default BlobDeleteForm
