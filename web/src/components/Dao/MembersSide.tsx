import { classNames, TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Link } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { getIdenticonAvatar } from '../../helpers'
import { appModalStateAtom } from '../../store/app.state'
import { Button } from '../Form'
import DaoRequestMembershipModal from '../Modal/DaoRequestMembership'

type TDaoMembersSideProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    className?: string
}

const DaoMembersSide = (props: TDaoMembersSideProps) => {
    const { dao, className } = props
    const setModal = useSetRecoilState(appModalStateAtom)

    const onDaoRequestMembershipClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <DaoRequestMembershipModal dao={dao} />,
        })
    }

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div className="mb-4 font-medium">
                Members
                <span className="bg-gray-fafafd text-black text-xs py-1 px-2 ml-2 rounded-full">
                    {dao.details.members.length}
                </span>
            </div>
            <div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {dao.details.members.slice(0, 8).map((item, index) => (
                        <div key={index} className="w-9 overflow-hidden rounded-full">
                            <img
                                src={getIdenticonAvatar({
                                    seed: item.profile,
                                    radius: 50,
                                }).toDataUriSync()}
                                alt=""
                                className="w-full"
                            />
                        </div>
                    ))}
                </div>

                {dao.details.isAuthMember && (
                    <div className="text-center">
                        <Link
                            to={`/o/${dao.details.name}/members`}
                            className="text-blue-348eff text-sm"
                        >
                            + Invite members
                        </Link>
                    </div>
                )}
            </div>

            {dao.details.version !== '1.0.0' &&
                dao.details.isAuthenticated &&
                !dao.details.isAuthMember && (
                    <>
                        <hr className="my-5 bg-gray-e6edff" />
                        {!dao.details.isAskMembershipOn ? (
                            <div>
                                <h3 className="mb-2 text-xl font-medium">
                                    This is closed organization
                                </h3>
                                <div className="text-gray-7c8db5">
                                    Please contact one of the DAO members to ask to invite
                                    you
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="mb-2 text-xl font-medium">
                                    You are not a member
                                </h3>
                                <div>
                                    <Button
                                        className={classNames(
                                            'w-full !border-gray-e6edff bg-gray-fafafd',
                                            'hover:!border-gray-53596d',
                                        )}
                                        variant="custom"
                                        onClick={onDaoRequestMembershipClick}
                                    >
                                        Request membership
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
        </div>
    )
}

export { DaoMembersSide }
