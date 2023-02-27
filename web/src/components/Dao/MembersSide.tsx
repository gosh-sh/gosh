import { classNames, TDao } from 'react-gosh'
import { Link } from 'react-router-dom'
import avatar from '../../assets/images/avatar.png'

type TDaoMembersSideProps = {
    dao: TDao
    className?: string
}

const DaoMembersSide = (props: TDaoMembersSideProps) => {
    const { dao, className } = props

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div className="mb-4 font-medium">
                Members
                <span className="bg-gray-fafafd text-black text-xs py-1 px-2 ml-2 rounded-full">
                    {dao.members.length}
                </span>
            </div>
            <div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {dao.members.slice(0, 8).map((_, index) => (
                        <div key={index} className="w-9 overflow-hidden rounded-full">
                            <img src={avatar} alt="" className="w-full" />
                        </div>
                    ))}
                </div>

                {dao.isAuthMember && (
                    <div className="text-center">
                        <Link
                            to={`/o/${dao.name}/members`}
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
