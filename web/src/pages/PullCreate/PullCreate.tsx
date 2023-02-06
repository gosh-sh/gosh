import { Navigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import PullCreate_1_0_0 from './1.0.0/PullCreate'
import PullCreate_1_1_0 from './1.1.0/PullCreate'

const PullCreatePage = () => {
    const { daoName, repoName } = useParams()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()

    if (!dao.details.isAuthMember) {
        return <Navigate to={`/o/${daoName}/r/${repoName}`} />
    }
    if (dao.details.version === '1.0.0') {
        return <PullCreate_1_0_0 dao={dao.details} repository={repository.adapter} />
    }
    if (dao.details.version === '1.1.0') {
        return <PullCreate_1_1_0 dao={dao.details} repository={repository.adapter} />
    }
    return null
}

export default PullCreatePage
