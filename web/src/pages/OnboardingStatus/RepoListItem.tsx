import { faCheckCircle, faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { TOnboardingRepo } from './OnboardingStatus'

type TRepoListItemProps = {
    item: TOnboardingRepo
    dao: string
    onRepoNameChange(id: string, dao: string, value: string): Promise<void>
}

const RepoListItem = (props: TRepoListItemProps) => {
    const { item, dao, onRepoNameChange } = props

    const isNameValid = !item.validated || item.validated.valid === true

    return (
        <div className="signup__repoitem repoitem">
            <div className="repoitem__header">
                {item.shouldUpdate ? (
                    <div className="font-normal w-full">
                        <div
                            className={classNames(
                                'input flex items-center',
                                !isNameValid ? 'has-error' : null,
                            )}
                        >
                            <input
                                type="text"
                                className="element !py-1 !px-2"
                                placeholder="Provide another repository name"
                                defaultValue={item.name}
                                onChange={(e) => {
                                    onRepoNameChange(item.id, dao, e.target.value)
                                }}
                            />
                            <FontAwesomeIcon
                                icon={
                                    !isNameValid ? faTriangleExclamation : faCheckCircle
                                }
                                size="lg"
                                className={classNames(
                                    'mr-2',
                                    !isNameValid ? 'text-red-dd3a3a' : null,
                                )}
                            />
                        </div>
                        <div className="text-red-dd3a3a text-xs">
                            {item.validated?.reason}
                        </div>
                    </div>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faHardDrive} className="repoitem__icon" />
                        <div className="repoitem__title">{item.name}</div>
                    </>
                )}
            </div>

            {item.updatedAt && (
                <p className="repoitem__secondary">
                    Updated on {new Date(item.updatedAt).toLocaleDateString()}
                </p>
            )}

            {!item.updatedAt && !item.shouldUpdate && (
                <div className="repoitem__secondary">
                    <Spinner className="mr-3" />
                    Uploading
                </div>
            )}
        </div>
    )
}

export default RepoListItem
