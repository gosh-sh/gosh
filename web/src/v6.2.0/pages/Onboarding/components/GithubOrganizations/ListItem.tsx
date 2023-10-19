import { Transition } from '@headlessui/react'
import { TOnboardingOrganization } from '../../../../types/onboarding.types'
import { TOAuthSession } from '../../../../types/oauth.types'
import { useOnboardingData } from '../../../../hooks/onboarding.hooks'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { GithubRepositories } from '../GithubRepositories'

type TOrganizationListItemProps = {
    oauth: TOAuthSession
    item: TOnboardingOrganization
    signoutOAuth(): Promise<void>
}

const OrganizationListItem = (props: TOrganizationListItemProps) => {
    const { oauth, item, signoutOAuth } = props
    const { toggleOrganization } = useOnboardingData(oauth)

    const selected = item.repositories.items
        .filter((r) => r.isSelected)
        .map((r, index) => (
            <span key={index} className="text-blue-348eff pr-2">
                {r.name}
            </span>
        ))

    return (
        <div className="border rounded-xl overflow-hidden">
            <div
                className="flex flex-nowrap p-5 cursor-pointer hover:bg-gray-fafafd"
                onClick={() => {
                    toggleOrganization(item.id)
                }}
            >
                <div className="w-16 shrink-0">
                    <img src={item.avatar} className="w-full rounded-xl" alt="Avatar" />
                </div>
                <div className="grow pl-4 overflow-hidden">
                    <div className="relative mb-1">
                        <div className="text-xl font-medium leading-tight whitespace-nowrap text-ellipsis overflow-hidden max-w-[80%]">
                            {item.name}
                        </div>
                        <div className="absolute right-1 top-0 text-base text-gray-7c8db5">
                            <FontAwesomeIcon
                                icon={faChevronUp}
                                className={classNames(
                                    'transition-transform',
                                    item.isOpen ? 'rotate-180' : null,
                                )}
                            />
                        </div>
                    </div>

                    <p className="text-xs md:text-sm text-gray-53596d">
                        {item.description}
                    </p>

                    <div className="text-gray-53596d text-xs mt-3 hidden lg:block">
                        {selected?.length ? selected : 'Select repository'}
                    </div>
                </div>
            </div>
            <div className="text-gray-53596d text-xs border-t px-5 py-2 mt-0 block lg:hidden">
                {selected?.length ? selected : 'Select repository'}
            </div>

            <Transition
                show={item.isOpen}
                enter="transition-transform origin-top duration-200"
                enterFrom="scale-y-0"
                enterTo="scale-y-100"
                leave="transition-transform origin-top duration-200"
                leaveFrom="scale-y-100"
                leaveTo="scale-y-0"
            >
                <div className="max-h-96 overflow-auto">
                    <GithubRepositories
                        organization={item}
                        isOpen={item.isOpen}
                        signoutOAuth={signoutOAuth}
                    />
                </div>
            </Transition>
        </div>
    )
}

export default OrganizationListItem
