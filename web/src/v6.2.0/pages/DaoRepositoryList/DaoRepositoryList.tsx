import classNames from 'classnames'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
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
            <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
                {member.isMember && (
                    <div className="grow text-end">
                        <Button
                            variant="outline-secondary"
                            size="xl"
                            test-id="link-repo-create"
                            onClick={onRepositoryCreateClick}
                        >
                            Create new
                        </Button>
                    </div>
                )}
            </div>

            <div
                className={classNames(
                    'mb-1.5 text-end',
                    !repositories.isFetching ? 'invisible' : null,
                )}
            >
                <Loader className="text-xs">Updating</Loader>
            </div>
            <ListBoundary count={count} />
        </>
    )
}

export default DaoRepositoryListPage
