import { Field, Form, Formik } from 'formik'
import { Tab } from '@headlessui/react'
import { classNames, getCodeLanguageFromFilename, splitByPath, TDao } from 'react-gosh'
import { TPushProgress } from 'react-gosh/dist/types/repo.types'
import RepoBreadcrumbs from '../Repo/Breadcrumbs'
import { FormikInput } from '../Formik'
import { useMonaco } from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faEye } from '@fortawesome/free-solid-svg-icons'
import BlobEditor from '../Blob/Editor'
import BlobPreview from '../Blob/Preview'
import { Button } from '../Form'
import yup from '../../yup-extended'
import { CommitFields } from './CommitFields/CommitFields'

export type TBlobCommitFormValues = {
    name: string
    content: string
    title: string
    message?: string
    tags?: string
    task?: string
    reviewers?: string
    manager?: string
    isPullRequest?: boolean
}

type TBlobCommitFormProps = {
    className?: string
    dao: TDao
    repo: string
    branch: string
    treepath: string
    initialValues: TBlobCommitFormValues
    validationSchema?: object
    isUpdate?: boolean
    extraButtons?: any
    urlBack?: string
    progress?: TPushProgress
    onSubmit(values: TBlobCommitFormValues): Promise<void>
}

const BlobCommitForm = (props: TBlobCommitFormProps) => {
    const {
        className,
        dao,
        repo,
        branch,
        treepath,
        initialValues,
        validationSchema,
        isUpdate,
        extraButtons,
        urlBack,
        progress,
        onSubmit,
    } = props

    const monaco = useMonaco()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<number>(0)
    const [codeLanguage, setCodeLanguage] = useState<string>('plaintext')

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
            name: yup.string().required('Field is required'),
            title: yup.string().required('Field is required'),
            ...validationSchema,
            ...(dao.version === '1.1.0' ? version_1_1_0 : {}),
        })
    }

    const onFilenameBlur = (
        e: any,
        values: TBlobCommitFormValues,
        handleBlur: any,
        setFieldValue: any,
    ) => {
        if (isUpdate) {
            return
        }

        // Formik `handleBlur` event
        handleBlur(e)

        // Resolve file code language by it's extension and update editor
        const language = getCodeLanguageFromFilename(monaco, e.target.value)
        setCodeLanguage(language)

        // Set commit title
        if (!values.title) {
            setFieldValue('title', `Create ${e.target.value}`)
        }
    }

    useEffect(() => {
        if (monaco && treepath) {
            const language = getCodeLanguageFromFilename(monaco, treepath)
            setCodeLanguage(language)
        }
    }, [monaco, treepath])

    return (
        <div className={classNames(className)}>
            <Formik
                initialValues={getInitialValues()}
                validationSchema={getValidationSchema()}
                onSubmit={onSubmit}
            >
                {({ values, setFieldValue, isSubmitting, handleBlur }) => (
                    <Form>
                        <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                            <div className="flex flex-wrap items-baseline gap-y-2">
                                <RepoBreadcrumbs
                                    daoName={dao.name}
                                    repoName={repo}
                                    branchName={branch}
                                    pathName={
                                        !isUpdate ? treepath : splitByPath(treepath)[0]
                                    }
                                    isBlob={false}
                                />
                                <div>
                                    <Field
                                        name="name"
                                        component={FormikInput}
                                        errorEnabled={false}
                                        autoComplete="off"
                                        placeholder="Name of new file"
                                        disabled={
                                            isSubmitting || !monaco || activeTab === 1
                                        }
                                        onBlur={(e: any) => {
                                            onFilenameBlur(
                                                e,
                                                values,
                                                handleBlur,
                                                setFieldValue,
                                            )
                                        }}
                                    />
                                </div>
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

                        <div className="mt-5 border border-gray-e6edff rounded-xl overflow-hidden">
                            <Tab.Group
                                defaultIndex={activeTab}
                                onChange={(index) => setActiveTab(index)}
                            >
                                <Tab.List>
                                    <Tab
                                        className={({ selected }) =>
                                            classNames(
                                                'px-4 py-3 border-r text-sm',
                                                selected
                                                    ? 'bg-white border-b-white font-medium text-extblack'
                                                    : 'bg-transparent border-b-transparent text-extblack/70 hover:text-extblack',
                                            )
                                        }
                                    >
                                        <FontAwesomeIcon
                                            icon={faCode}
                                            size="sm"
                                            className="mr-1"
                                        />
                                        Edit
                                    </Tab>
                                    <Tab
                                        className={({ selected }) =>
                                            classNames(
                                                'px-4 py-3 text-sm',
                                                selected
                                                    ? 'bg-white border-b-white border-r font-medium text-extblack'
                                                    : 'bg-transparent border-b-transparent text-extblack/70 hover:text-extblack',
                                            )
                                        }
                                    >
                                        <FontAwesomeIcon
                                            icon={faEye}
                                            size="sm"
                                            className="mr-1"
                                        />
                                        Preview
                                    </Tab>
                                </Tab.List>
                                <Tab.Panels className="-mt-[1px] border-t">
                                    <Tab.Panel>
                                        <BlobEditor
                                            language={codeLanguage}
                                            value={values.content}
                                            onChange={(value) => {
                                                setFieldValue('content', value)
                                            }}
                                        />
                                    </Tab.Panel>
                                    <Tab.Panel>
                                        <BlobPreview
                                            filename={values.name}
                                            value={values.content}
                                        />
                                    </Tab.Panel>
                                </Tab.Panels>
                            </Tab.Group>
                        </div>

                        <CommitFields
                            dao={dao}
                            className="mt-12"
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

export { BlobCommitForm }
