import { Link } from 'react-router-dom'
import classNames from 'classnames'
import { getIdenticonAvatar } from '../../../helpers'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { Button } from '../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { RequestDaoMembershipModal } from '../Modal'

type TDaoMembersProps = React.HTMLAttributes<HTMLDivElement>

const DaoMembers = (props: TDaoMembersProps) => {
    const { className } = props
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const member = useDaoMember()

    const onRequestDaoMembership = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <RequestDaoMembershipModal />,
        })
    }

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div className="mb-4 font-medium">
                Members
                <span className="bg-gray-fafafd text-black text-xs py-1 px-2 ml-2 rounded-full">
                    {dao.details.members?.length}
                </span>
            </div>
            <div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {dao.details.members?.slice(0, 8).map((item, index) => (
                        <div key={index} className="w-9 overflow-hidden rounded-full">
                            <img
                                src={getIdenticonAvatar({
                                    seed: item.profile.address,
                                    radius: 50,
                                }).toDataUriSync()}
                                alt=""
                                className="w-full"
                            />
                        </div>
                    ))}
                </div>

                {member.isMember && (
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

            {member.profile && !member.isMember && (
                <>
                    <hr className="my-5 bg-gray-e6edff" />
                    {!dao.details.isAskMembershipOn ? (
                        <div>
                            <h3 className="mb-4 text-xl font-medium">
                                This is a private organization
                            </h3>
                            <div className="text-gray-7c8db5">
                                Please contact one of the DAO members to ask to invite you
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="mb-4 text-xl font-medium">
                                You are not a member
                            </h3>
                            <div>
                                <Button
                                    className={classNames(
                                        'w-full !border-gray-e6edff bg-gray-fafafd',
                                        'hover:!border-gray-53596d',
                                    )}
                                    variant="outline-secondary"
                                    onClick={onRequestDaoMembership}
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

export { DaoMembers }
