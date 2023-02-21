import { TDao } from 'react-gosh'
import { Link } from 'react-router-dom'
import avatar from '../../assets/images/avatar.png'

type TDaoMembersSideProps = {
    details: TDao
}

const DaoMembersSide = (props: TDaoMembersSideProps) => {
    const { details } = props

    return (
        <div className="border border-gray-e6edff rounded-xl p-5 my-5">
            <div className="mb-4 font-medium">
                Members
                <span className="bg-gray-fafafd text-black text-xs py-1 px-2 ml-2 rounded-full">
                    {details.members.length}
                </span>
            </div>
            <div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {details.members.slice(0, 8).map((_, index) => (
                        <div key={index} className="w-9 overflow-hidden rounded-full">
                            <img src={avatar} alt="" className="w-full" />
                        </div>
                    ))}
                </div>

                {details.isAuthMember && (
                    <div className="text-center">
                        <Link
                            to={`/o/${details.name}/members`}
                            className="text-blue-348eff text-sm"
                        >
                            + Invite members
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export { DaoMembersSide }
