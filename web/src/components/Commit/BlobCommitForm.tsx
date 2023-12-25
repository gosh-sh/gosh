import { Field, Form, Formik } from 'formik'
import { Tab } from '@headlessui/react'
import {
  classNames,
  getCodeLanguageFromFilename,
  splitByPath,
  TDao,
  TUserParam,
} from 'react-gosh'
import { TPushProgress, TRepository } from 'react-gosh/dist/types/repo.types'
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
import { CommitFields } from './CommitFields/CommitFields'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import yup from '../../v1.0.0/yup-extended'

export type TBlobCommitFormValues = {
  name: string
  content: string
  title: string
  message?: string
  tags?: string
  task?: string
  assigners?: string | TUserParam[]
  reviewers?: string | TUserParam[]
  managers?: string | TUserParam[]
  isPullRequest?: boolean
}

type TBlobCommitFormProps = {
  className?: string
  dao: {
    adapter: IGoshDaoAdapter
    details: TDao
  }
  repository: {
    adapter: IGoshRepositoryAdapter
    details: TRepository
  }
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
    repository,
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
    const version_1_0_0 = {}
    const version_2_0_0 = {
      task: '',
      assigners: '',
      reviewers: '',
      managers: '',
      isPullRequest: false,
    }
    const version_3_0_0 = {
      task: '',
      assigners: [],
      reviewers: [],
      managers: [],
      isPullRequest: false,
    }

    let versionised = {}
    if (dao.details.version === '1.0.0') {
      versionised = version_1_0_0
    } else if (dao.details.version === '2.0.0') {
      versionised = version_2_0_0
    } else if (dao.details.version === '3.0.0') {
      versionised = version_3_0_0
    } else {
      versionised = version_3_0_0
    }

    return { ...initialValues, ...versionised }
  }

  const getValidationSchema = () => {
    const version_1_0_0 = {}
    const version_2_0_0 = {
      task: yup.string(),
      assigners: yup.string().test('check-task', 'Field is required', function (value) {
        if (this.parent.task && !value) {
          return false
        }
        return true
      }),
      reviewers: yup.string(),
      managers: yup.string(),
      isPullRequest: yup
        .boolean()
        .test(
          'check-pullrequest',
          'Proposal is required if task was selected',
          function (value) {
            if (this.parent.task && !value) {
              return false
            }
            return true
          },
        ),
    }
    const version_3_0_0 = {
      task: yup.string(),
      assigners: yup.array().test('check-task', 'Min 1 assigner', function (value) {
        if (this.parent.task && !value?.length) {
          return false
        }
        return true
      }),
      reviewers: yup.array(),
      managers: yup.array(),
      isPullRequest: yup
        .boolean()
        .test(
          'check-pullrequest',
          'Proposal is required if task was selected',
          function (value) {
            if (this.parent.task && !value) {
              return false
            }
            return true
          },
        ),
    }

    let versionised = {}
    if (dao.details.version === '1.0.0') {
      versionised = version_1_0_0
    } else if (dao.details.version === '2.0.0') {
      versionised = version_2_0_0
    } else if (dao.details.version === '3.0.0') {
      versionised = version_3_0_0
    } else {
      versionised = version_3_0_0
    }

    return yup.object().shape({
      name: yup.string().required('Field is required'),
      title: yup.string().required('Field is required'),
      ...validationSchema,
      ...versionised,
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
                  daoName={dao.details.name}
                  repoName={repository.details.name}
                  branchName={branch}
                  pathName={!isUpdate ? treepath : splitByPath(treepath)[0]}
                  isBlob={false}
                />
                <div>
                  <Field
                    name="name"
                    component={FormikInput}
                    errorEnabled={false}
                    autoComplete="off"
                    placeholder="Name of new file"
                    disabled={isSubmitting || !monaco || activeTab === 1}
                    onBlur={(e: any) => {
                      onFilenameBlur(e, values, handleBlur, setFieldValue)
                    }}
                    test-id="input-file-name"
                  />
                </div>
                <span className="mx-2">in</span>
                <span>{branch}</span>
              </div>

              {urlBack && (
                <Button
                  disabled={isSubmitting}
                  onClick={() => navigate(urlBack)}
                  test-id="btn-commit-discard-top"
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
                    <FontAwesomeIcon icon={faCode} size="sm" className="mr-1" />
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
                    <FontAwesomeIcon icon={faEye} size="sm" className="mr-1" />
                    Preview
                  </Tab>
                </Tab.List>
                <Tab.Panels className="-mt-[1px] border-t">
                  <Tab.Panel>
                    <BlobEditor
                      language={codeLanguage}
                      value={values.content}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        setFieldValue('content', value)
                      }}
                    />
                  </Tab.Panel>
                  <Tab.Panel>
                    <BlobPreview
                      filename={values.name}
                      value={values.content}
                      commentsOn={false}
                    />
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
            <CommitFields
              dao={dao.adapter}
              repository={repository.details.name}
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
