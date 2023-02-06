import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { TDao, useDaoMemberDelete, useDaoMemberList } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { ButtonLink, Input } from '../../../../components/Form'
import MemeberList_1_0_0 from './1.0.0/MemberList'
import MemeberList_1_1_0 from './1.1.0/MemberList'

type TMemberListProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    scrollToInviteRef(): void
}

const MemberList = (props: TMemberListProps) => {
    const { dao, scrollToInviteRef } = props
    const { search, setSearch, ...restMembers } = useDaoMemberList(dao.adapter, 0)
    const removal = useDaoMemberDelete(dao.adapter)
    const version = dao.details.version

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
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
                {dao.details.isAuthMember && (
                    <ButtonLink to="" onClick={scrollToInviteRef}>
                        Invite member
                    </ButtonLink>
                )}
            </div>

            <div className="mt-8 mb-2">
                <div className="border rounded-xl px-1 py-2 overflow-x-auto">
                    {version === '1.0.0' && (
                        <MemeberList_1_0_0
                            daoDetails={dao.details}
                            members={{ search, setSearch, ...restMembers }}
                            removal={removal}
                        />
                    )}
                    {version === '1.1.0' && (
                        <MemeberList_1_1_0
                            dao={dao}
                            members={{ search, setSearch, ...restMembers }}
                            removal={removal}
                        />
                    )}
                </div>
            </div>
        </>
    )
}

export { MemberList }
