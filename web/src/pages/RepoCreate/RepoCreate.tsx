import { Navigate, useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import RepoCreatePage_1_0_0 from './1.0.0/RepoCreate'
import RepoCreatePage_1_1_0 from './1.1.0/RepoCreate'

const RepoCreatePage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()

    if (!dao.details.isAuthMember) {
        return <Navigate to={`/o/${dao.details.name}`} />
    }
    if (dao.details.version === '1.0.0') {
        return <RepoCreatePage_1_0_0 />
    }
    return <RepoCreatePage_1_1_0 />
}

export default RepoCreatePage
