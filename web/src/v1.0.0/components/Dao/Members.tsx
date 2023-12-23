import { Link } from 'react-router-dom'
import classNames from 'classnames'
import { getIdenticonAvatar } from '../../../helpers'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'

type TDaoMembersProps = React.HTMLAttributes<HTMLDivElement>

const DaoMembers = (props: TDaoMembersProps) => {
  const { className } = props
  const dao = useDao()
  const member = useDaoMember()

  return (
    <div className={classNames('border border-gray-e6edff rounded-xl p-5', className)}>
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
    </div>
  )
}

export { DaoMembers }
