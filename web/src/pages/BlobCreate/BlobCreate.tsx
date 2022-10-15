import { useState } from 'react'
import { Field, Form, Formik } from 'formik'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import TextField from '../../components/FormikForms/TextField'
import { useMonaco } from '@monaco-editor/react'
import * as Yup from 'yup'
import { Tab } from '@headlessui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faEye } from '@fortawesome/free-solid-svg-icons'
import BlobEditor from '../../components/Blob/Editor'
import BlobPreview from '../../components/Blob/Preview'
import FormCommitBlock from './FormCommitBlock'
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs'
import { getCodeLanguageFromFilename, classNames, usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'

type TFormValues = {
    name: string
    content: string
    title: string
    message: string
    tags: string
}

const BlobCreatePage = () => {
    const filepath = useParams()['*']
    const monaco = useMonaco()
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { push, progress: pushProgress } = usePush(dao.details, repo, branchName)

    const [activeTab, setActiveTab] = useState<number>(0)
    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext')

    const urlBack = `/o/${daoName}/r/${repoName}/tree/${branchName}${
        filepath && `/${filepath}`
    }`

    const onCommitChanges = async (values: TFormValues) => {
        try {
            const { name, title, message, tags, content } = values
            const treepath = `${filepath ? `${filepath}/` : ''}${name}`
            await push(
                title,
                [{ treepath, original: '', modified: content }],
                message,
                tags,
            )
            navigate(urlBack)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthMember) return <Navigate to={urlBack} />
    return (
        <div className="bordered-block py-8">
            <Formik
                initialValues={{
                    name: '',
                    content: '',
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
                {({ values, setFieldValue, isSubmitting, handleBlur }) => (
                    <Form className="px-4 sm:px-7">
                        <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                            <div className="flex flex-wrap items-baseline gap-y-2">
                                <RepoBreadcrumbs
                                    daoName={daoName}
                                    repoName={repoName}
                                    branchName={branchName}
                                    pathName={filepath}
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
                                            disabled: !monaco || activeTab === 1,
                                            onBlur: (e: any) => {
                                                // Formik `handleBlur` event
                                                handleBlur(e)

                                                // Resolve file code language by it's extension
                                                // and update editor
                                                const language =
                                                    getCodeLanguageFromFilename(
                                                        monaco,
                                                        e.target.value,
                                                    )
                                                setBlobCodeLanguage(language)

                                                // Set commit title
                                                if (!values.title) {
                                                    setFieldValue(
                                                        'title',
                                                        `Create ${e.target.value}`,
                                                    )
                                                }
                                            },
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
                                        Edit new file
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
                                            language={blobCodeLanguage}
                                            value={values.content}
                                            onChange={(value) =>
                                                setFieldValue('content', value)
                                            }
                                        />
                                    </Tab.Panel>
                                    <Tab.Panel>
                                        <BlobPreview
                                            language={blobCodeLanguage}
                                            value={values.content}
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
        </div>
    )
}

export default BlobCreatePage
