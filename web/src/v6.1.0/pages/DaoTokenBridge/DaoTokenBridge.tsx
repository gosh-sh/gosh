import { ButtonLink } from '../../../components/Form'
import { DaoMemberWallet, DaoMembers, DaoSupply } from '../../components/Dao'
import { useDaoMember } from '../../hooks/dao.hooks'

const DaoTokenBridgePage = () => {
    const member = useDaoMember()

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full md:!basis-0">
                <div className="border border-gray-e6edff rounded-xl px-5 py-24">
                    <div className="max-w-lg mx-auto">
                        <div className="max-w-md mx-auto">
                            <img
                                src="/images/bridge-img.webp"
                                alt="Bridge"
                                className="w-full"
                            />
                        </div>
                        <div className="mt-7 max-w-[9.375em] mx-auto">
                            <img
                                src="/images/bridge-soon.webp"
                                alt="Coming soon"
                                className="w-full"
                            />
                        </div>
                        <h2 className="mt-6 font-medium text-3xl text-center leading-normal">
                            DAO Token exchange with Ethereum Bridge
                        </h2>
                        <div className="mt-9 text-center">
                            <ButtonLink to="/a/bridge" size="xl">
                                Test Ethereum Bridge Alfa version
                            </ButtonLink>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col !max-w-full md:!max-w-side-right-md xl:!max-w-side-right">
                <div className="flex flex-col gap-y-5">
                    <DaoSupply />
                    {member.isMember && <DaoMemberWallet />}
                    <DaoMembers />
                </div>
            </div>
        </div>
    )
}

export default DaoTokenBridgePage
