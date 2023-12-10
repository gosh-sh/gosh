import { faCheckCircle, faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Loader from '../../../../components/Loader/Loader'
import classNames from 'classnames'
import { Input } from '../../../../components/Form'
import { TOnboardingStatusRepo } from '../../../types/onboarding.types'

type TRepoListItemProps = {
    item: TOnboardingStatusRepo
    dao: string
    onRepoNameChange(id: string, dao: string, value: string): Promise<void>
}

const RepoListItem = (props: TRepoListItemProps) => {
    const { item, dao, onRepoNameChange } = props

    const isNameValid = !item.validated || item.validated.valid === true

    return (
        <div className="p-5 cursor-pointer hover:bg-gray-fafafd">
            <div className="relative flex flex-nowrap items-center mb-2">
                {item.shouldUpdate ? (
                    <div className="w-full">
                        <Input
                            type="text"
                            placeholder="Provide another repository name"
                            defaultValue={item.name}
                            hasError={!!item.validated?.reason}
                            after={
                                <FontAwesomeIcon
                                    icon={
                                        !isNameValid
                                            ? faTriangleExclamation
                                            : faCheckCircle
                                    }
                                    size="lg"
                                    className={classNames(
                                        'py-1.5 px-2 text-green-34c759',
                                        !isNameValid ? '!text-red-dd3a3a' : null,
                                    )}
                                />
                            }
                            onChange={(e) => {
                                onRepoNameChange(item.id, dao, e.target.value)
                            }}
                        />
                        {item.validated?.reason && (
                            <div className="text-red-dd3a3a text-xs">
                                {item.validated?.reason}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faHardDrive} className="mr-2.5" />
                        <div className="font-medium text-blue-2b89ff whitespace-nowrap text-ellipsis overflow-hidden max-w-[80%]">
                            {item.name}
                        </div>
                    </>
                )}
            </div>

            {item.updatedAt && (
                <div className="text-sm text-gray-53596d">
                    Updated on {new Date(item.updatedAt).toLocaleDateString()}
                </div>
            )}

            {!item.updatedAt && !item.shouldUpdate && (
                <div className="text-sm text-gray-53596d">
                    <Loader>Uploading</Loader>
                </div>
            )}
        </div>
    )
}

export default RepoListItem
