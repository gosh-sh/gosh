import { useEffect, useState } from 'react'
import { Field, Form, Formik } from 'formik'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import * as Yup from 'yup'
import TextField from '../../components/FormikForms/TextField'
import { Tab } from '@headlessui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faEye } from '@fortawesome/free-solid-svg-icons'
import BlobEditor from '../../components/Blob/Editor'
import FormCommitBlock from '../BlobCreate/FormCommitBlock'
import { useMonaco } from '@monaco-editor/react'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs'
import {
    EGoshError,
    GoshError,
    getCodeLanguageFromFilename,
    splitByPath,
    classNames,
    useBlob,
    usePush,
} from 'react-gosh'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import { Buffer } from 'buffer'
import ToastError from '../../components/Error/ToastError'

type TFormValues = {
    name: string
    content: string
    title: string
    message: string
    tags: string
}

const BlobUpdatePage = () => {
    const treepath = useParams()['*']
    const monaco = useMonaco()
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const blob = useBlob(daoName!, repoName!, branchName, treepath)
    const { push, progress: pushProgress } = usePush(dao.details, repo, branchName)

    const [activeTab, setActiveTab] = useState<number>(0)
    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext')

    const urlBack = `/o/${daoName}/r/${repoName}/blobs/view/${branchName}${
        treepath && `/${treepath}`
    }`

    const onCommitChanges = async (values: TFormValues) => {
        try {
            const { name, title, message, tags, content } = values
            const [path] = splitByPath(treepath || '')
            const treepathNew = `${path ? `${path}/` : ''}${name}`
            await push(
                title,
                [
                    {
                        treepath: treepathNew,
                        original: blob?.content ?? '',
                        modified: content,
                    },
                ],
                message,
                tags,
            )
            navigate(urlBack)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (Buffer.isBuffer(blob.content)) {
            toast.error(EGoshError.FILE_BINARY)
            navigate(urlBack)
        }
    }, [blob.content, navigate, urlBack])

    useEffect(() => {
        if (monaco && treepath) {
            const language = getCodeLanguageFromFilename(monaco, treepath)
            setBlobCodeLanguage(language)
        }
    }, [monaco, treepath])

    if (!dao.details.isAuthMember) return <Navigate to={urlBack} />
    return (
        <div className="bordered-block py-8">
            <div className="px-4 sm:px-7">
                {!blob.isFetching && blob.content === undefined && (
                    <div className="text-gray-606060 text-sm">File not found</div>
                )}
                {blob.isFetching && (
                    <div className="text-gray-606060 text-sm">
                        <Spinner className="mr-3" />
                        Loading file...
                    </div>
                )}
            </div>
            {monaco && blob.path && !blob.isFetching && (
                <Formik
                    initialValues={{
                        name: splitByPath(blob.path)[1],
                        content: blob.content ? blob.content.toString() : '',
                        title: '',
                        message: '',
                        tags: '',
                    }}
                    validationSchema={Yup.object().shape({
                        name: Yup.string().required('Field is required'),
                        title: Yup.string().required('Field is required'),
                    })}
                    onSubmit={onCommitChanges}
                >
                    {({ values, setFieldValue, isSubmitting }) => (
                        <Form className="px-4 sm:px-7">
                            <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                                <div className="flex flex-wrap items-baseline gap-y-2">
                                    <RepoBreadcrumbs
                                        daoName={daoName}
                                        repoName={repoName}
                                        branchName={branchName}
                                        pathName={treepath}
                                        pathOnly={true}
                                        isBlob={false}
                                    />
                                    <div>
                                        <Field
                                            name="name"
                                            component={TextField}
                                            inputProps={{
                                                className: '!text-sm !py-1.5',
                                                autoComplete: 'off',
                                                placeholder: 'Name of new file',
                                                disabled: true,
                                            }}
                                        />
                                    </div>
                                    <span className="mx-2">in</span>
                                    <span>{branchName}</span>
                                </div>

                                <button
                                    className="btn btn--body px-3 py-1.5 !text-sm !font-normal text-center w-full sm:w-auto"
                                    disabled={isSubmitting}
                                    onClick={() => navigate(urlBack)}
                                >
                                    Discard changes
                                </button>
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
                                            Edit file
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
                                            Preview changes
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels className="-mt-[1px] border-t">
                                        <Tab.Panel>
                                            <BlobEditor
                                                language={blobCodeLanguage}
                                                value={values.content}
                                                onChange={(value) =>
                                                    setFieldValue('content', value)
                                                }
                                            />
                                        </Tab.Panel>
                                        <Tab.Panel>
                                            <BlobDiffPreview
                                                className="pt-[1px]"
                                                original={blob.content}
                                                modified={values.content}
                                                modifiedLanguage={blobCodeLanguage}
                                            />
                                        </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>
                            </div>

                            <FormCommitBlock
                                urlBack={urlBack}
                                isDisabled={!monaco || isSubmitting}
                                isSubmitting={isSubmitting}
                                progress={pushProgress}
                            />
                        </Form>
                    )}
                </Formik>
            )}
        </div>
    )
}

export default BlobUpdatePage
