import { useOutletContext } from 'react-router-dom'
import { ESmvEventType, useSmv } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import ReposPage from '../DaoRepos'
import { DaoMembersSide, DaoSupplySide, DaoWalletSide } from '../../components/Dao'
import { DaoDescription, DaoEventsRecent } from './components'
import { Button } from '../../components/Form'

const DaoPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const wallet = useSmv(dao)

    return (
        <div className="flex flex-wrap gap-4 justify-between">
            <div className="grow">
                {/* <div className="flex gap-5">
                    <Button
                        onClick={async () => {
                            await dao.adapter.voteDao({
                                wallet: '0:8fbfe52317e3e2ed09e9bfb7d4a440ebba6e712a19c98ec859bce34b3dddcb60',
                                platformId:
                                    '0xb5fdcbbac63d940aa04ced7776f33067644754f600e0ababd82275b63a8595a7',
                                choice: true,
                                amount: 5,
                            })
                        }}
                    >
                        DAO vote
                    </Button>
                    <Button
                        onClick={async () => {
                            await dao.adapter.sendDaoToken({
                                wallet: '0:96c7acca98bd39883d9d146e14b94b78c04b1ad4672febdd159d4b82929bc9b2',
                                amount: 1,
                                profile:
                                    '0:414a60611bc8268c6392c105dc8162fefc0297e735822e5008c5ce9ffad01f94',
                            })
                        }}
                    >
                        DAO token send
                    </Button>
                    <Button
                        onClick={async () => {
                            await dao.adapter.reviewDao({
                                wallet: '0:96c7acca98bd39883d9d146e14b94b78c04b1ad4672febdd159d4b82929bc9b2',
                                eventAddress:
                                    '0:d01a044e3477f4f4a06a5423f12eaeeb8e3a5f1ec1cccc85845e4e0a296e413d',
                                choice: true,
                            })
                        }}
                    >
                        DAO review
                    </Button>
                    <Button
                        onClick={async () => {
                            await dao.adapter.receiveTaskBountyDao({
                                wallet: '0:96c7acca98bd39883d9d146e14b94b78c04b1ad4672febdd159d4b82929bc9b2',
                                repoName: '_index',
                                taskName: 'task1',
                            })
                        }}
                    >
                        DAO receive bounty
                    </Button>
                    <Button
                        onClick={async () => {
                            await dao.adapter.lockDaoToken({
                                wallet: '0:96c7acca98bd39883d9d146e14b94b78c04b1ad4672febdd159d4b82929bc9b2',
                                isLock: false,
                                amount: 1,
                            })
                        }}
                    >
                        DAO lock token
                    </Button>
                    <Button
                        onClick={async () => {
                            await dao.adapter.createMultiProposalAsDao({
                                wallet: '0:96c7acca98bd39883d9d146e14b94b78c04b1ad4672febdd159d4b82929bc9b2',
                                proposals: [
                                    {
                                        type: ESmvEventType.DAO_TOKEN_MINT,
                                        params: {
                                            amount: 100,
                                        },
                                    },
                                    {
                                        type: ESmvEventType.DAO_TAG_ADD,
                                        params: {
                                            tags: ['remote-tag'],
                                        },
                                    },
                                    {
                                        type: ESmvEventType.DAO_TOKEN_DAO_LOCK,
                                        params: {
                                            wallet: '0:96c7acca98bd39883d9d146e14b94b78c04b1ad4672febdd159d4b82929bc9b2',
                                            isLock: true,
                                            amount: 1,
                                        },
                                    },
                                ],
                            })
                        }}
                    >
                        DAO multi
                    </Button>
                </div> */}
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
