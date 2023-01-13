import emptylogo from '../../assets/images/emptylogo.svg'
import { Transition } from '@headlessui/react'
import RepoListItem from './RepoListItem'
import { TOnboardingDao } from './Onboarding'
import { classNames } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faExclamationTriangle,
    faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons'

type TDaoListItemProps = {
    item: TOnboardingDao
    index: number
    onDaoToggle(name: string): void
    onDaoNameChange(index: number, value: string): Promise<void>
    onRepoNameChange(id: string, dao: string, value: string): Promise<void>
}

const DaoListItem = (props: TDaoListItemProps) => {
    const { item, index, onDaoToggle, onDaoNameChange, onRepoNameChange } = props

    const isNameValid = !item.validated || item.validated.valid === true
    const isReposValid = item.repos.every(
        (repo) => !repo.validated || repo.validated.valid === true,
    )

    return (
        <div className="signup__orgitem orgitem">
            <div
                className="orgitem__main"
                onClick={() => {
                    onDaoToggle(item.name)
                }}
            >
                <div className="orgitem__media">
                    <img src={emptylogo} alt="" />
                </div>
                <div className="orgitem__content">
                    <div className="orgitem__header">
                        <div
                            className={classNames(
                                'orgitem__title',
                                item.validated?.valid === false ? '!text-rose-600' : null,
                            )}
                        >
                            {item.name}
                        </div>
                        <div
                            className={classNames(
                                'orgitem__arrow',
                                item.isOpen ? 'orgitem__arrow-open' : null,
                            )}
                        >
                            <i className="icon-arrow"></i>
                        </div>
                    </div>
                    <p className="orgitem__description">
                        {item.progress.uploaded !== item.progress.total && (
                            <Spinner className="mr-2" />
                        )}
                        Uploaded ({item.progress.uploaded} / {item.progress.total} repos)
                    </p>
                    {(!isNameValid || !isReposValid) && (
                        <div className="orgitem__footer !flex items-center">
                            <div className="grow text-rose-600">
                                {!isNameValid && <p>{item.validated?.reason}</p>}
                                {!isReposValid && <p>Problems with repository names</p>}
                            </div>
                            <div className="text-rose-600">
                                <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
                            </div>
                        </div>
                    )}
                </div>
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
                <div>
                    {item.shouldUpdate && (
                        <div className="p-5">
                            <div
                                className={classNames(
                                    'input flex items-center',
                                    !isNameValid ? 'has-error' : null,
                                )}
                            >
                                <input
                                    type="text"
                                    className="element !py-1 !px-2"
                                    placeholder="Provide another DAO name"
                                    value={item.name}
                                    onChange={(e) => {
                                        onDaoNameChange(index, e.target.value)
                                    }}
                                />
                                <FontAwesomeIcon
                                    icon={
                                        !isNameValid
                                            ? faTriangleExclamation
                                            : faCircleCheck
                                    }
                                    size="lg"
                                    className={classNames(
                                        'mr-2',
                                        !isNameValid ? 'text-red-dd3a3a' : null,
                                    )}
                                />
                            </div>
                            {item.validated?.reason && (
                                <div className="text-red-dd3a3a text-xs">
                                    {item.validated.reason}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="orgitem__repos">
                        {item.repos.map((repo, i) => (
                            <RepoListItem
                                key={i}
                                item={repo}
                                dao={item.name}
                                onRepoNameChange={onRepoNameChange}
                            />
                        ))}
                    </div>
                </div>
            </Transition>
        </div>
    )
}

export default DaoListItem
