import { useOutletContext } from 'react-router-dom'
import { useSmv } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import ReposPage from '../DaoRepos'
import { DaoMembersSide, DaoSupplySide, DaoWalletSide } from '../../components/Dao'
import { DaoDescription, DaoEventsRecent } from './components'

const DaoPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const wallet = useSmv(dao)

    return (
        <div className="flex flex-wrap gap-4 justify-between">
            <div className="grow">
                <DaoDescription dao={dao} />
                <DaoEventsRecent dao={dao} />
                <div className="grow">
                    <ReposPage />
                </div>
            </div>
            <div className="basis-4/12 flex flex-col gap-y-5">
                <DaoSupplySide dao={dao} />
                {dao.details.isAuthenticated && (
                    <DaoWalletSide dao={dao} wallet={wallet} />
                )}
                <DaoMembersSide dao={dao} />
            </div>
        </div>
    )
}

export default DaoPage