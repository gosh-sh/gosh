import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useSetRecoilState } from 'recoil'
import { Button, Input } from '../../../components/Form'
import Loader from '../../../components/Loader'
import { appModalStateAtom } from '../../../store/app.state'
import { RepositoryCreateModal } from '../../components/Modal'
import { useDaoMember } from '../../hooks/dao.hooks'
import { useDaoRepositoryList } from '../../hooks/repository.hooks'
import { ListBoundary } from './components'

const DaoRepositoryListPage = (props: { count?: number }) => {
  const { count = 10 } = props
  const repositories = useDaoRepositoryList()
  const member = useDaoMember()
  const setModal = useSetRecoilState(appModalStateAtom)

  const onRepositoryCreateClick = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <RepositoryCreateModal />,
    })
  }

  return (
    <>
      <div className="flex items-center justify-between pb-2 mb-4 gap-4">
        <h3 className="text-xl font-medium">Repositories</h3>
        {repositories.isFetching && <Loader className="text-xs">Updating...</Loader>}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <Input
          className="grow"
          type="search"
          placeholder="Search repository (disabled)"
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
            onClick={onRepositoryCreateClick}
          >
            Create new
          </Button>
        )}
      </div>

      <ListBoundary count={count} />
    </>
  )
}

export default DaoRepositoryListPage
