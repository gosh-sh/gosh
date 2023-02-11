import { TDao, TPushProgress } from 'react-gosh'
import CommitFields_1_0_0 from './1.0.0/CommitFileds'
import CommitFields_1_1_0 from './1.1.0/CommitFileds'

type TCommitFieldsProps = {
    className?: string
    dao: TDao
    isSubmitting: boolean
    urlBack?: string
    extraButtons?: any
    progress?: TPushProgress
}

const CommitFields = (props: TCommitFieldsProps) => {
    const { dao, ...rest } = props

    if (dao.version === '1.0.0') {
        return <CommitFields_1_0_0 {...rest} />
    }
    if (dao.version === '1.1.0') {
        return <CommitFields_1_1_0 {...rest} />
    }
    return null
}

export { CommitFields }
