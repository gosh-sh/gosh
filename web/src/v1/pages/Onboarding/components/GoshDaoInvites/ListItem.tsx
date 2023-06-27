import { TOnboardingInvite } from '../../../../types/onboarding.types'
import { TOAuthSession } from '../../../../types/oauth.types'
import { useOnboardingData } from '../../../../hooks/onboarding.hooks'
import classNames from 'classnames'
import emptylogo from '../../../../../assets/images/emptylogo.svg'
import { Button } from '../../../../../components/Form'

type TOrganizationListItemProps = {
    oauth: TOAuthSession
    item: TOnboardingInvite
}

const DaoInviteListItem = (props: TOrganizationListItemProps) => {
    const { oauth, item } = props
    const { toggleDaoInvite } = useOnboardingData(oauth)

    return (
        <div className="border rounded-xl overflow-hidden">
            <div className="flex flex-nowrap p-5">
                <div className="w-16 shrink-0">
                    <img src={emptylogo} className="w-full rounded-xl" alt="Avatar" />
                </div>
                <div className="grow pl-4 overflow-hidden">
                    <div className="relative mb-1">
                        <div className="text-xl font-medium leading-tight whitespace-nowrap text-ellipsis overflow-hidden max-w-[80%]">
                            {item.daoName}
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4 mt-3">
                        <Button
                            type="button"
                            variant="custom"
                            size="sm"
                            className={classNames(
                                '!border !border-gray-e6edff rounded-lg py-1 px-6',
                                'text-sm text-red-ff3b30',
                                'bg-gray-fafafd',
                                'hover:bg-red-ff3b30/10 hover:!border-red-ff3b30',
                                item.accepted === false
                                    ? '!bg-red-ff3b30 !text-white !border-transparent'
                                    : null,
                            )}
                            onClick={() => {
                                toggleDaoInvite(false, item)
                            }}
                        >
                            Reject
                        </Button>
                        <Button
                            type="button"
                            variant="custom"
                            size="sm"
                            className={classNames(
                                '!border !border-gray-e6edff rounded-lg py-1 px-6',
                                'text-sm text-green-600',
                                'bg-gray-fafafd',
                                'hover:bg-green-50 hover:!border-green-600',
                                item.accepted === true
                                    ? '!bg-green-600 !text-white !border-transparent'
                                    : null,
                            )}
                            onClick={() => {
                                toggleDaoInvite(true, item)
                            }}
                        >
                            Accept
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DaoInviteListItem
