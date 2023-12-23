import { Form, Formik } from 'formik'
import { classNames, TDao, TUserParam } from 'react-gosh'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { TPushProgress, TRepository } from 'react-gosh/dist/types/repo.types'
import { CommitFields } from './CommitFields/CommitFields'
import yup from '../../v1.0.0/yup-extended'

export type TBranchCommitFormValues = {
  title: string
  message?: string
  tags?: string
  deleteSrcBranch?: boolean
  task?: string
  assigners?: string | TUserParam[]
  reviewers?: string
  managers?: string
  isPullRequest?: boolean
}

type TBranchCommitFormProps = {
  className?: string
  dao: {
    adapter: IGoshDaoAdapter
    details: TDao
  }
  repository: {
    adapter: IGoshRepositoryAdapter
    details: TRepository
  }
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
    repository,
    initialValues,
    validationSchema,
    extraButtons,
    progress,
    onSubmit,
  } = props

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
            <CommitFields
              dao={dao.adapter}
              repository={repository.details.name}
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
