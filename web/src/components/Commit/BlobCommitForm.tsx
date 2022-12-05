import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { Tab } from '@headlessui/react'
import { classNames, getCodeLanguageFromFilename, splitByPath } from 'react-gosh'
import { TPushProgress } from 'react-gosh/dist/types/repo.types'
import CommitFields from './CommitFileds'
import RepoBreadcrumbs from '../Repo/Breadcrumbs'
import { TextField } from '../Formik'
import { useMonaco } from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faEye } from '@fortawesome/free-solid-svg-icons'
import BlobEditor from '../Blob/Editor'
import BlobPreview from '../Blob/Preview'

type TBlobCommitFormValues = {
    name: string
    content: string
    title: string
    message?: string
    tags?: string
}

type TBlobCommitFormProps = {
    className?: string
    dao: string
    repo: string
    branch: string
    treepath: string
    initialValues: TBlobCommitFormValues
    validationSchema?: object
    isUpdate?: boolean
    isDisabled?: boolean
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
        isDisabled,
        extraButtons,
        urlBack,
        progress,
        onSubmit,
    } = props

    const monaco = useMonaco()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<number>(0)
    const [codeLanguage, setCodeLanguage] = useState<string>('plaintext')

    const onFilenameBlur = (
        e: any,
        values: TBlobCommitFormValues,
        handleBlur: any,
        setFieldValue: any,
    ) => {
        if (isUpdate) return

        // Formik `handleBlur` event
        handleBlur(e)

        // Resolve file code language by it's extension and update editor
        const language = getCodeLanguageFromFilename(monaco, e.target.value)
        setCodeLanguage(language)

        // Set commit title
        if (!isUpdate && !values.title) {
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
                initialValues={initialValues}
                validationSchema={Yup.object().shape({
                    name: Yup.string().required('Field is required'),
                    title: Yup.string().required('Field is required'),
                    ...validationSchema,
                })}
                onSubmit={onSubmit}
            >
                {({ values, setFieldValue, isSubmitting, handleBlur }) => (
                    <Form className="px-4 sm:px-7">
                        <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                            <div className="flex flex-wrap items-baseline gap-y-2">
                                <RepoBreadcrumbs
                                    daoName={dao}
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
                                        component={TextField}
                                        errorEnabled={false}
                                        inputProps={{
                                            className: '!text-sm !px-2.5 !py-1.5',
                                            autoComplete: 'off',
                                            placeholder: 'Name of new file',
                                            disabled:
                                                isSubmitting ||
                                                isDisabled ||
                                                !monaco ||
                                                activeTab === 1,
                                            onBlur: (e: any) => {
                                                onFilenameBlur(
                                                    e,
                                                    values,
                                                    handleBlur,
                                                    setFieldValue,
                                                )
                                            },
                                        }}
                                    />
                                </div>
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
                            className="mt-4"
                            isSubmitting={isSubmitting}
                            isDisabled={!monaco || isDisabled}
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

export default BlobCommitForm
