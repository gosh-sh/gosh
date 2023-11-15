import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { getIdenticonAvatar } from '../../../helpers'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useUser } from '../../hooks/user.hooks'
import { RequestDaoMembershipModal } from '../Modal'

type TDaoMembersProps = React.HTMLAttributes<HTMLDivElement>

const DaoMembers = (props: TDaoMembersProps) => {
    const { className } = props
    const setModal = useSetRecoilState(appModalStateAtom)
    const location = useLocation()
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const [deeplink, setDeeplink] = useState<{ relative: string; absolute: string }>({
        relative: '',
        absolute: '',
    })

    const onRequestDaoMembership = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <RequestDaoMembershipModal />,
        })
    }

    useEffect(() => {
        if (location.hash === '#request-membership' && user.profile) {
            onRequestDaoMembership()
        }
        document.location.hash = ''
    }, [location.hash, user.profile])

    useEffect(() => {
        const relative = `/o/${dao.details.name}#request-membership`
        setDeeplink({ relative, absolute: `${document.location.origin}${relative}` })
    }, [document.location.origin, dao.details.name])

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
                    <div className="flex flex-col gap-y-2 items-center">
                        <Link
                            to={`/o/${dao.details.name}/members`}
                            className="text-blue-348eff text-sm"
                        >
                            <FontAwesomeIcon
                                icon={faPlus}
                                size="sm"
                                fixedWidth
                                className="mr-2"
                            />
                            Invite members
                        </Link>
                    </div>
                )}
            </div>

            <div>
                {!member.isMember && (
                    <>
                        <hr className="my-5 bg-gray-e6edff" />
                        {!dao.details.isAskMembershipOn && (
                            <div>
                                <h3 className="mb-4 text-lg font-medium">
                                    This is a private organization
                                </h3>
                                <div className="text-sm text-gray-7c8db5">
                                    Please contact one of the DAO members to ask to invite
                                    you
                                </div>
                            </div>
                        )}
                    </>
                )}

                {dao.details.isAskMembershipOn && !user.profile && (
                    <div>
                        <h3 className="mb-4 text-xl font-medium">Request membership</h3>
                        <div className="text-sm">
                            <Link
                                to={`/a/signin?redirect_to=${deeplink.relative}`}
                                className="text-blue-2b89ff"
                            >
                                Sign in
                            </Link>{' '}
                            to request membership
                        </div>
                    </div>
                )}

                {dao.details.isAskMembershipOn && member.profile && !member.isMember && (
                    <div>
                        <h3 className="mb-4 text-xl font-medium">You are not a member</h3>
                        <div>
                            <Button
                                className="w-full !border-gray-e6edff bg-gray-fafafd hover:!border-gray-53596d"
                                variant="outline-secondary"
                                onClick={onRequestDaoMembership}
                            >
                                Request membership
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export { DaoMembers }
