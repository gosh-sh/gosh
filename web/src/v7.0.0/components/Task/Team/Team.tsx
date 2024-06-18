import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MemberIcon } from '../../../../components/Dao'
import { Button } from '../../../../components/Form'
import { shortString } from '../../../../utils'
import {
  useDao,
  useReceiveTaskReward,
  useReceiveTaskRewardAsDao,
} from '../../../hooks/dao.hooks'
import { useUser } from '../../../hooks/user.hooks'
import {
  EDaoMemberType,
  TTaskDetails,
  TTaskTeamMember,
} from '../../../types/dao.types'
import { isTaskTeamMember } from '../helpers'

const TaskTeamMembers = (props: {
  task: TTaskDetails
  users?: TTaskTeamMember[]
  grant: number
}) => {
  const { task, users, grant } = props
  const navigate = useNavigate()
  const { user } = useUser()
  const userReward = useReceiveTaskReward()
  const daoReward = useReceiveTaskRewardAsDao()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const receiveRewardAsUser = async () => {
    try {
      setIsSubmitting(true)
      await userReward.receiveReward({
        reponame: task.repository.name,
        taskname: task.name,
      })
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const receiveRewardAsDao = async (name: string, addr: string) => {
    try {
      setIsSubmitting(true)
      const { eventaddr } = await daoReward.receiveReward({
        dst_dao_addr: addr,
        repo_name: task.repository.name,
        task_name: task.name,
      })

      if (eventaddr) {
        navigate(`/o/${name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {users?.map((item, i) => (
        <div key={i} className="grid grid-cols-2 items-center gap-3">
          <div>
            <MemberIcon type={item.usertype} size="sm" className="mr-2" />
            {item.username}
          </div>
          {task.isReady && grant > 0 && (
            <div>
              {item.usertype === EDaoMemberType.User &&
                isTaskTeamMember(task.team, user.profile) && (
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    onClick={receiveRewardAsUser}
                  >
                    Claim
                  </Button>
                )}
              {item.usertype === EDaoMemberType.Dao && user.profile && (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  onClick={() => {
                    receiveRewardAsDao(item.username, item.profile)
                  }}
                >
                  Claim
                </Button>
              )}
            </div>
          )}
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
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Assigners
        </div>
        <div className="grow text-sm flex flex-col gap-3">
          <TaskTeamMembers
            task={props.task}
            users={team?.assigners}
            grant={props.task.grantTotal.assign}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Reviewers
        </div>
        <div className="grow text-sm flex flex-col gap-3">
          <TaskTeamMembers
            task={props.task}
            users={team?.reviewers}
            grant={props.task.grantTotal.review}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Managers
        </div>
        <div className="grow text-sm flex flex-col gap-3">
          <TaskTeamMembers
            task={props.task}
            users={team?.managers}
            grant={props.task.grantTotal.manager}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Commit
        </div>
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
