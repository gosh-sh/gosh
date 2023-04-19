import { useOutletContext } from 'react-router-dom'
import { useSmv, useUser } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import ReposPage from '../DaoRepos'
import { DaoMembersSide, DaoSupplySide, DaoWalletSide } from '../../components/Dao'
import { DaoDescription, DaoEventsRecent } from './components'
import { signerKeys } from '@eversdk/core'
import { Button } from '../../components/Form'

const DaoPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const wallet = useSmv(dao)
    const { user } = useUser()

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full md:!basis-0">
                <Button
                    onClick={async () => {
                        await dao.adapter.startPaidMembership({
                            value: 15,
                            valuepersubs: 10,
                            timeforsubs: 180,
                            keyforservice: `0x${user.keys!.public}`,
                        })
                    }}
                >
                    Start membership
                </Button>
                <Button
                    onClick={async () => {
                        await dao.adapter.dao.run(
                            'deployMemberFromSubs',
                            {
                                pubaddr:
                                    '0:fde749811f34a7c1a5a2b70b940915be88536ac2c3a78469d2d42de7fba83afa',
                            },
                            { signer: signerKeys(user.keys!) },
                        )
                    }}
                >
                    Member from membership
                </Button>
                {/* <Button
                    onClick={async () => {
                        await dao.adapter.dao.run(
                            'startCheckPaidMembershipService',
                            {},
                            { signer: signerKeys(user.keys!) },
                        )
                    }}
                >
                    Check membership
                </Button> */}
                <Button
                    onClick={async () => {
                        await dao.adapter.stopPaidMembership({})
                    }}
                >
                    Stop membership
                </Button>
                <DaoEventsRecent dao={dao} className="mb-5" />
                <DaoDescription dao={dao} className="mb-5" />
                <ReposPage />
            </div>
            <div className="col !max-w-full md:!max-w-side-right-md lg:!max-w-side-right">
                <div className="flex flex-col gap-y-5">
                    <DaoSupplySide dao={dao} />
                    {dao.details.isAuthenticated && (
                        <DaoWalletSide dao={dao} wallet={wallet} />
                    )}
                    <DaoMembersSide dao={dao} />
                </div>
            </div>
        </div>
    )
}

export default DaoPage
