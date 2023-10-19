import classNames from 'classnames'
import { Button } from '../../../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { ListBoundary } from './ListBoundary'
import { useDaoInviteList } from '../../../../hooks/dao.hooks'

const MemberInviteList = () => {
    const inviteList = useDaoInviteList({ initialize: true })

    return (
        <div className="flex flex-col h-full">
            <div className="grow">
                <ListBoundary />
            </div>

            <div>
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={inviteList.isFetching}
                    isLoading={inviteList.isFetching}
                    onClick={inviteList.getInviteList}
                >
                    {!inviteList.isFetching && (
                        <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
                    )}
                    Refresh
                </Button>
            </div>
        </div>
    )
}

export { MemberInviteList }
