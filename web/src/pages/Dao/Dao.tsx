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
            <div className="basis-8/12">
                <DaoDescription dao={dao} />
                <DaoEventsRecent dao={dao} />
                <div className="grow">
                    <ReposPage />
                </div>
            </div>
            <div className="grow flex flex-col gap-y-5">
                <DaoSupplySide dao={dao} />
                <DaoWalletSide dao={dao} wallet={wallet} />
                <DaoMembersSide dao={dao.details} />
            </div>
        </div>
    )
}

export default DaoPage
