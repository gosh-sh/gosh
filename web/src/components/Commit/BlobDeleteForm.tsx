import { Form, Formik } from 'formik'
import { classNames, TDao, TPushProgress, TRepository, TUserParam } from 'react-gosh'
import RepoBreadcrumbs from '../Repo/Breadcrumbs'
import { useNavigate } from 'react-router-dom'
import BlobDiffPreview from '../Blob/DiffPreview'
import { Button } from '../Form'
import { CommitFields } from './CommitFields/CommitFields'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import yup from '../../v1.0.0/yup-extended'

export type TBlobDeleteFormValues = {
  title: string
  message?: string
  tags?: string
  task?: string
  assigners?: string | TUserParam[]
  reviewers?: string
  managers?: string
  isPullRequest?: boolean
}

type TBlobDeleteFormProps = {
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
    repository,
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
      title: yup.string().required('Field is required'),
      ...validationSchema,
      ...versionised,
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
                  daoName={dao.details.name}
                  repoName={repository.details.name}
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
                  test-id="btn-commit-discard-top"
                >
                  Discard changes
                </Button>
              )}
            </div>

            <div className="mt-5 relative overflow-hidden">
              <BlobDiffPreview
                dao={dao.adapter}
                filename={treepath}
                original={content}
                modified=""
                commentsOn={false}
                isDiffLoaded
                getDiff={() => {}}
              />
            </div>

            <CommitFields
              dao={dao.adapter}
              repository={repository.details.name}
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
