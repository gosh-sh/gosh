import { faCode, faCodeFork } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import CopyClipboard from '../../components/CopyClipboard';
import { TGoshRepoDetails } from '../../types/types';
import { shortString } from '../../utils';

type TRepositoryListItemProps = {
    daoName: string;
    daoLink?: boolean;
    item: TGoshRepoDetails;
};

const RepositoryListItem = (props: TRepositoryListItemProps) => {
    const { daoName, item, daoLink = false } = props;

    return (
        <div className="py-3">
            <div className="flex flex-wrap">
                {daoLink && (
                    <>
                        <Link
                            className="text-xl font-semibold hover:underline"
                            to={`/${daoName}`}
                        >
                            {daoName}
                        </Link>
                        <span className="mx-1">/</span>
                    </>
                )}
                <Link
                    className="text-xl font-semibold hover:underline"
                    to={`/${daoName}/${item.name}`}
                >
                    {item.name}
                </Link>
            </div>

            <div className="text-sm text-gray-606060">Gosh repository</div>

            {!!item.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag, index) => (
                        <button
                            key={index}
                            type="button"
                            className="rounded-2xl bg-extblue/25 text-xs text-extblue px-2 py-1 hover:bg-extblue hover:text-white"
                        >
                            {tag.content}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-4 mt-3 text-xs text-gray-606060 justify-between">
                <div className="flex gap-4">
                    <div>
                        <FontAwesomeIcon icon={faCode} className="mr-1" />
                        Language
                    </div>
                    <div>
                        <FontAwesomeIcon icon={faCodeFork} className="mr-1" />
                        {item.branches.length}
                    </div>
                    {/* <div>
                        <FontAwesomeIcon icon={faStar} className="mr-1" />
                        22
                    </div> */}
                </div>
                <CopyClipboard
                    componentProps={{
                        text: item.address,
                    }}
                    className="hover:text-gray-050a15"
                    label={shortString(item.address)}
                />
            </div>
        </div>
    );
};

export default RepositoryListItem;
