import { Link } from 'react-router-dom'
import Skeleton from '../../../../components/Skeleton'
import { getIdenticonAvatar } from '../../../../helpers'
import { THackathonParticipant } from '../../../types/hackathon.types'

const ListItemSkeleton = () => {
    return (
        <Skeleton className="p-4" skeleton={{ height: 40 }}>
            <rect x="0" y="0" rx="6" ry="6" width="30%" height="20" />
            <rect x="0" y="30" rx="4" ry="4" width="180" height="10" />
        </Skeleton>
    )
}

type TRepositoryListItemProps = {
    item: THackathonParticipant
}

const ListItem = (props: TRepositoryListItemProps) => {
    const { item } = props

    return (
        <div className="p-4">
            <div className="flex items-center gap-4">
                <div className="grow">
                    <div className="flex items-center flex-wrap gap-2">
                        <div className="w-8">
                            <img
                                src={getIdenticonAvatar({
                                    seed: item.dao_name,
                                    radius: 50,
                                }).toDataUriSync()}
                                alt=""
                                className="w-full"
                            />
                        </div>
                        <div>
                            <span>{item.dao_name}</span>
                            <span className="mx-1">/</span>
                            <Link
                                className="font-medium text-blue-2b89ff"
                                to={`/o/${item.dao_name}/r/${item.repo_name}`}
                            >
                                {item.repo_name}
                            </Link>
                        </div>
                    </div>

                    {item.description && (
                        <div className="mt-2.5 text-sm text-gray-53596d">
                            {item.description}
                        </div>
                    )}
                </div>
                <div className="basis-5/12 shrink-0">
                    {/* <div>
                        <Checkbox className="ml-auto w-full" />
                    </div> */}
                    {/* <div className="flex flex-nowrap items-center justify-between gap-x-12">
                        <div className="flex flex-nowrap items-center justify-between gap-x-2">
                            <Button className="block !px-3.5" variant="outline-secondary">
                                <FontAwesomeIcon icon={faMinus} />
                            </Button>
                            <Input placeholder="Your vote" />
                            <Button className="block !px-3.5" variant="outline-secondary">
                                <FontAwesomeIcon icon={faPlus} />
                            </Button>
                        </div>
                        <div>
                            <Button
                                className="block !bg-white !px-3.5"
                                variant="outline-secondary"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </Button>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    )
}

export { ListItem, ListItemSkeleton }
