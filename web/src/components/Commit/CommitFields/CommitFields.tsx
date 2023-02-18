import { TPushProgress } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import CommitFields_1_0_0 from './1.0.0/CommitFileds'
import CommitFields_1_1_0 from './1.1.0/CommitFileds'

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
        return <CommitFields_1_0_0 {...rest} />
    }
    return <CommitFields_1_1_0 dao={dao} repository={repository} {...rest} />
}

export { CommitFields }
