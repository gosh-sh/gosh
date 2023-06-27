import { useOutletContext } from 'react-router-dom'
// import ReposPage from '../DaoRepos'
// import { DaoMembersSide, DaoSupplySide, DaoWalletSide } from '../../components/Dao'
import { DaoDescription, DaoEventsRecent } from './components'
// import { useDao } from '../../hooks/dao.hooks'

const DaoPage = () => {
    // const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    // const wallet = useSmv(dao)
    // const dao = useDao()

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full md:!basis-0">
                {/* <DaoEventsRecent dao={dao} className="mb-5" />
                <DaoDescription dao={dao} className="mb-5" />
                <ReposPage /> */}
            </div>
            <div className="col !max-w-full md:!max-w-side-right-md lg:!max-w-side-right">
                <div className="flex flex-col gap-y-5">
                    {/* <DaoSupplySide dao={dao} />
                    {dao.details.isAuthenticated && (
                        <DaoWalletSide dao={dao} wallet={wallet} />
                    )}
                    <DaoMembersSide dao={dao} /> */}
                </div>
            </div>
        </div>
    )
}

export default DaoPage
