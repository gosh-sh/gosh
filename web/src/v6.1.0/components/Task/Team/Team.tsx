import { Link } from 'react-router-dom'
import { MemberIcon } from '../../../../components/Dao'
import { TTaskDetails, TTaskTeamMember } from '../../../types/dao.types'
import { useDao } from '../../../hooks/dao.hooks'
import { shortString } from '../../../../utils'

const TaskTeamMembers = (props: { users?: TTaskTeamMember[] }) => {
  const { users } = props

  return (
    <>
      {users?.map((user, i) => (
        <div key={i}>
          <MemberIcon type={user.usertype} size="sm" className="mr-2" />
          {user.username}
        </div>
      ))}
    </>
  )
}

type TTaskTeamProps = {
  task: TTaskDetails
}

const TaskTeam = (props: TTaskTeamProps) => {
  const {
    task: { repository, team },
  } = props
  const dao = useDao()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Assigners</div>
        <div className="text-sm flex flex-wrap gap-3">
          <TaskTeamMembers users={team?.assigners} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Reviewers</div>
        <div className="text-sm flex flex-wrap gap-3">
          <TaskTeamMembers users={team?.reviewers} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Managers</div>
        <div className="text-sm flex flex-wrap gap-3">
          <TaskTeamMembers users={team?.managers} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Commit</div>
        <div className="text-sm flex flex-wrap gap-3">
          <Link
            to={`/o/${dao.details.name}/r/${repository.name}/commits/${team?.commit.branch}/${team?.commit.name}`}
            className="text-blue-2b89ff"
          >
            {shortString(team?.commit.name || '')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export { TaskTeam }
