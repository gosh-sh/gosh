import { useEffect, useState } from 'react'
import { Button, Input } from '../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { useDaoMember, useDaoTaskList } from '../../hooks/dao.hooks'
import Loader from '../../../components/Loader'
import { ListBoundary } from './components'
import { matchPath } from 'react-router-dom'
import classNames from 'classnames'
import TaskPage from '../Task'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { MilestoneCreateModal } from '../../components/Modal'
import MilestonePage from '../Milestone/Milestone'

const DaoTaskListPage = () => {
  const member = useDaoMember()
  const taskList = useDaoTaskList()
  const setModal = useSetRecoilState(appModalStateAtom)
  const [taskOpened, setTaskOpened] = useState<string>()
  const [milestoneOpened, setMilestoneOpened] = useState<string>()

  const onCreateMilestone = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <MilestoneCreateModal />,
    })
  }

  useEffect(() => {
    const matched = [
      matchPath('/o/:dao/tasks/:address', document.location.pathname),
      matchPath('/o/:dao/tasks/milestone/:address', document.location.pathname),
    ]
    if (matched[0]?.params.address) {
      taskList.openItem(matched[0].params.address)
      setMilestoneOpened(undefined)
      setTaskOpened(matched[0].params.address)
    } else if (matched[1]?.params.address) {
      taskList.openItem(matched[1].params.address)
      setMilestoneOpened(matched[1].params.address)
      setTaskOpened(undefined)
    } else {
      taskList.closeItems()
      setMilestoneOpened(undefined)
      setTaskOpened(undefined)
    }
  }, [document.location.pathname])

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <Input
          className="grow"
          type="search"
          placeholder="Search (disabled)"
          autoComplete="off"
          disabled
          before={
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="text-gray-7c8db5 font-extralight py-3 pl-4"
            />
          }
          test-id="input-task-search"
        />
        {member.isMember && (
          <Button
            variant="outline-secondary"
            size="xl"
            test-id="btn-milestone-create"
            onClick={onCreateMilestone}
          >
            Create milestone
          </Button>
        )}
      </div>

      <div>
        <Loader
          className={classNames(
            'text-xs text-right mb-2',
            taskList.isFetching ? 'visible' : 'invisible',
          )}
        >
          Updating
        </Loader>
        <ListBoundary />
      </div>

      <div
        className={classNames(
          'fixed w-full lg:w-[60%] top-0 right-0 h-screen bg-white overflow-y-auto',
          'border border-gray-e6edff rounded-l-xl px-5 py-3.5 body-scroll-lock',
          'transition-all duration-300 shadow-xl',
          milestoneOpened || taskOpened ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {milestoneOpened && <MilestonePage address={milestoneOpened} />}
        {taskOpened && <TaskPage address={taskOpened} />}
      </div>
    </>
  )
}

export default DaoTaskListPage
