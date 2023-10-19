import { useRef } from 'react'
import { MemberAddForm, MemberList, MemberInviteList } from './components'
import { useDaoMember } from '../../hooks/dao.hooks'

const DaoMemberListPage = () => {
    const member = useDaoMember()
    const inviteRef = useRef<HTMLDivElement | null>(null)

    const scrollToInviteRef = () => {
        inviteRef.current?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
        })
    }

    return (
        <>
            <MemberList scrollToInviteRef={scrollToInviteRef} />

            {member.isMember && (
                <div
                    className="mt-6 flex flex-wrap items-start gap-y-6 gap-x-4"
                    ref={(ref) => {
                        inviteRef.current = ref
                    }}
                >
                    <div className="border rounded-xl p-5 md:p-8 basis-full lg:basis-5/12">
                        <MemberAddForm />
                    </div>
                    <div className="border rounded-xl overflow-hidden grow lg:basis-6/12">
                        <MemberInviteList />
                    </div>
                </div>
            )}
        </>
    )
}

export default DaoMemberListPage
