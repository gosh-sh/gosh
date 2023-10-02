import { ButtonLink } from '../../../components/Form'
import { DaoMemberWallet, DaoMembers, DaoSupply } from '../../components/Dao'
import { useDaoMember } from '../../hooks/dao.hooks'

const DaoTokenL2Page = () => {
    const member = useDaoMember()

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full md:!basis-0">
                <div className="border border-gray-e6edff rounded-xl px-5 py-24">
                    <div className="max-w-lg mx-auto">
                        <div className="max-w-md mx-auto">
                            <img
                                src="/images/bridge-img.webp"
                                alt="Ethereum L2"
                                className="w-full"
                            />
                        </div>
                        <h2 className="mt-7 font-medium text-xl lg:text-3xl text-center leading-normal">
                            GOSH Ethereum Layer 2
                        </h2>
                        <div className="mt-4 text-center lg:text-lg">
                            Connect DAO token with any erc-20 is coming soon
                        </div>
                        <div className="mt-9 text-center">
                            <ButtonLink to="/a/l2" size="xl">
                                Test ETH transfer now (in Alpha)
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

export default DaoTokenL2Page
