import { TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import successImage from '../../../../assets/images/success.png'
import { supabase } from '../../../../helpers'
import DAO_MEMBER_FORM_1_0_0 from './1.0.0/MemberForm'
import DAO_MEMBER_FORM_2_0_0 from './2.0.0/MemberForm'
import DAO_MEMBER_FORM_3_0_0 from './3.0.0/MemberForm'

type TDaoMemberFormProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    getDaoInvites(): Promise<void>
}

const InvitationSent = () => {
    return (
        <div className="bg-white">
            <div className="max-w-[9.75rem] mx-auto">
                <img src={successImage} alt="Success" className="w-full" />
            </div>
            <div className="mt-6">
                <h3 className="text-xl font-medium text-center mb-4">Success</h3>

                <p className="text-gray-7c8db5 text-sm mb-3">
                    Users invited by email will receive invitation email message
                </p>

                <p className="text-gray-7c8db5 text-sm">
                    Users invited by GOSH username are added to proposal and waiting for
                    voting
                </p>
            </div>
        </div>
    )
}

const DaoMemberForm = (props: TDaoMemberFormProps) => {
    const { dao, getDaoInvites } = props
    const version = dao.details.version

    const getUsernameByEmail = async (email: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('gosh_username')
            .eq('email', email)
            .order('created_at', { ascending: true })
        if (error) {
            console.warn('Error query user by email', error)
            return null
        }
        return data.length ? data[0].gosh_username : null
    }

    if (version === '1.0.0') {
        return (
            <DAO_MEMBER_FORM_1_0_0
                dao={dao}
                getDaoInvites={getDaoInvites}
                getUsernameByEmail={getUsernameByEmail}
                SuccessComponent={InvitationSent}
            />
        )
    } else if (version === '2.0.0') {
        return (
            <DAO_MEMBER_FORM_2_0_0
                dao={dao}
                getDaoInvites={getDaoInvites}
                getUsernameByEmail={getUsernameByEmail}
                SuccessComponent={InvitationSent}
            />
        )
    }
    return (
        <DAO_MEMBER_FORM_3_0_0
            dao={dao}
            getDaoInvites={getDaoInvites}
            getUsernameByEmail={getUsernameByEmail}
            SuccessComponent={InvitationSent}
        />
    )
}

export { DaoMemberForm }
