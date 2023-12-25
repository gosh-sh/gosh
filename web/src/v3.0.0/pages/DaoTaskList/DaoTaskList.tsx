import { useEffect, useState } from 'react'
import { Button, Input } from '../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { useDao, useDaoMember, useDaoTaskList } from '../../hooks/dao.hooks'
import Loader from '../../../components/Loader'
import { ListBoundary } from './components'
import { matchPath, useNavigate } from 'react-router-dom'
import classNames from 'classnames'
import TaskPage from '../Task'

const DaoTaskListPage = () => {
  const navigate = useNavigate()
  const dao = useDao()
  const member = useDaoMember()
  const taskList = useDaoTaskList()
  const [taskOpened, setTaskOpened] = useState<string>()

  const onTaskCreate = () => {
    navigate(`/o/${dao.details.name}/tasks/create`)
  }

  useEffect(() => {
    const matched = matchPath('/o/:dao/tasks/:address', document.location.pathname)
    if (matched?.params.address) {
      taskList.openItem(matched.params.address)
      setTaskOpened(matched.params.address)
    } else {
      taskList.closeItems()
      setTaskOpened(undefined)
    }
  }, [document.location.pathname])

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <Input
          className="grow"
          type="search"
          placeholder="Search task (disabled)"
          autoComplete="off"
          disabled
          before={
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="text-gray-7c8db5 font-extralight py-3 pl-4"
            />
          }
          test-id="input-repo-search"
        />
        {member.isMember && (
          <Button
            variant="outline-secondary"
            size="xl"
            test-id="link-repo-create"
            onClick={onTaskCreate}
          >
            Create new
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
          taskOpened ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <TaskPage address={taskOpened || ''} />
      </div>
    </>
  )
}

export default DaoTaskListPage
