import { faChevronDown, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Menu } from '@headlessui/react'
import classNames from 'classnames'
import { Fragment, useEffect, useState } from 'react'
import { matchPath } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button, Input } from '../../../components/Form'
import Loader from '../../../components/Loader'
import { appModalStateAtom } from '../../../store/app.state'
import { MilestoneCreateModal, TaskCreateModal } from '../../components/Modal'
import { useDaoMember, useDaoTaskList } from '../../hooks/dao.hooks'
import MilestonePage from '../Milestone/Milestone'
import TaskPage from '../Task'
import { ListBoundary } from './components'

const DaoTaskListPage = () => {
  const member = useDaoMember()
  const taskList = useDaoTaskList()
  const setModal = useSetRecoilState(appModalStateAtom)
  const [taskOpened, setTaskOpened] = useState<string>()
  const [milestoneOpened, setMilestoneOpened] = useState<string>()

  const onCreateTask = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <TaskCreateModal />,
    })
  }

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
          <Menu as="div" className="relative block">
            {({ open }) => (
              <>
                <Menu.Button as={Fragment}>
                  <Button variant="outline-secondary" size="xl">
                    Create new
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={classNames(
                        'ml-2 transition-transform duration-150',
                        open ? 'rotate-180' : 'rotate-0',
                      )}
                    />
                  </Button>
                </Menu.Button>
                <Menu.Items className="absolute w-full right-0 mt-2 origin-top-right border border-gray-e6edff rounded-md bg-white shadow-lg focus:outline-none overflow-clip divide-y divide-gray-e6edff z-1">
                  <Menu.Item
                    as={Button}
                    variant="custom"
                    className="block text-start text-gray-7c8db5 hover:text-black w-full border-0 rounded-none transition-colors duration-150"
                    test-id="btn-task-create"
                    onClick={onCreateTask}
                  >
                    Create task
                  </Menu.Item>
                  <Menu.Item
                    as={Button}
                    variant="custom"
                    className="block text-start text-gray-7c8db5 hover:text-black w-full border-0 rounded-none transition-colors duration-150"
                    test-id="btn-milestone-create"
                    onClick={onCreateMilestone}
                  >
                    Create milestone
                  </Menu.Item>
                </Menu.Items>
              </>
            )}
          </Menu>
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
