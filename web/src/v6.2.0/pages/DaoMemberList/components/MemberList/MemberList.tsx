import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Input } from '../../../../../components/Form'
import { ListBoundary } from './ListBoundary'
import Loader from '../../../../../components/Loader/Loader'
import classNames from 'classnames'
import { useState } from 'react'
import { useDaoMember, useDaoMemberList } from '../../../../hooks/dao.hooks'

type TMemberListProps = {
    scrollToInviteRef(): void
}

const MemberList = (props: TMemberListProps) => {
    const { scrollToInviteRef } = props
    const member = useDaoMember()
    const [search, setSearch] = useState<string>('')
    const memberList = useDaoMemberList({ initialize: true })

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <Input
                    className="grow"
                    type="search"
                    placeholder="Search member by name..."
                    autoComplete="off"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    before={
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="text-gray-7c8db5 font-extralight py-3 pl-4"
                        />
                    }
                />
                {member.isMember && (
                    <Button
                        variant="outline-secondary"
                        size="xl"
                        onClick={scrollToInviteRef}
                    >
                        Invite member
                    </Button>
                )}
            </div>

            <div>
                <Loader
                    className={classNames(
                        'text-xs text-right mb-2',
                        memberList.isFetching ? 'visible' : 'invisible',
                    )}
                >
                    Updating
                </Loader>
                <ListBoundary search={search} />
            </div>
        </>
    )
}

export { MemberList }
