import { TPushProgress } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import COMMIT_FIELDS_1_0_0 from './1.0.0/CommitFileds'
import COMMIT_FIELDS_2_0_0 from './2.0.0/CommitFileds'
import COMMIT_FIELDS_3_0_0 from './3.0.0/CommitFileds'

type TCommitFieldsProps = {
  dao: IGoshDaoAdapter
  repository: string
  isSubmitting: boolean
  className?: string
  urlBack?: string
  extraButtons?: any
  progress?: TPushProgress
}

const CommitFields = (props: TCommitFieldsProps) => {
  const { dao, repository, ...rest } = props
  const version = dao.getVersion()

  if (version === '1.0.0') {
    return <COMMIT_FIELDS_1_0_0 {...rest} />
  } else if (version === '2.0.0') {
    return <COMMIT_FIELDS_2_0_0 dao={dao} repository={repository} {...rest} />
  } else {
    return <COMMIT_FIELDS_3_0_0 dao={dao} repository={repository} {...rest} />
  }
}

export { CommitFields }
