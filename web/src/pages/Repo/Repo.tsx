import React, { useEffect } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { TRepoLayoutOutletContext } from '../RepoLayout';
import BranchSelect from '../../components/BranchSelect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClockRotateLeft,
    faCodeBranch,
    faFolder,
    faMagnifyingGlass,
    faFileCirclePlus,
    faCode,
    faChevronDown,
    faTerminal,
} from '@fortawesome/free-solid-svg-icons';
import { useRecoilValue } from 'recoil';
import { useGoshRepoBranches, useGoshRepoTree } from '../../hooks/gosh.hooks';
import Spinner from '../../components/Spinner';
import { isMainBranch, splitByPath } from '../../helpers';
import { faFile } from '@fortawesome/free-regular-svg-icons';
import { Menu, Transition } from '@headlessui/react';
import CopyClipboard from '../../components/CopyClipboard';
import { shortString } from '../../utils';

const RepoPage = () => {
    const pathName = useParams()['*'] || '';
    const { daoName, repoName, branchName } = useParams();
    const navigate = useNavigate();
    const { goshWallet, goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const { branches, branch, updateBranch } = useGoshRepoBranches(goshRepo, branchName);
    const goshRepoTree = useGoshRepoTree(goshRepo, branch, pathName);
    const subtree = useRecoilValue(goshRepoTree.getSubtree(pathName));

    const [dirUp] = splitByPath(pathName);

    useEffect(() => {
        if (branch?.name) updateBranch(branch.name);
    }, [branch?.name, updateBranch]);

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
                <div className="grow flex items-center gap-y-2 gap-x-5">
                    <BranchSelect
                        branch={branch}
                        branches={branches}
                        onChange={(selected) => {
                            if (selected) {
                                navigate(`/${daoName}/${repoName}/tree/${selected.name}`);
                            }
                        }}
                    />

                    <Link
                        to={`/${daoName}/${repoName}/branches`}
                        className="block text-sm text-gray-050a15/65 hover:text-gray-050a15"
                    >
                        <span className="font-semibold">
                            <FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
                            {branches.length}
                        </span>
                        <span className="hidden sm:inline-block ml-1">branches</span>
                    </Link>

                    <Link
                        to={`/${daoName}/${repoName}/commits/${branch?.name}`}
                        className="block text-sm text-gray-050a15/65 hover:text-gray-050a15"
                    >
                        <FontAwesomeIcon icon={faClockRotateLeft} />
                        <span className="hidden sm:inline-block ml-1">History</span>
                    </Link>
                </div>

                <div className="flex grow gap-3 justify-end">
                    <Link
                        to={`/${daoName}/${repoName}/find/${branch?.name}`}
                        className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <span className="hidden sm:inline-block ml-2">Go to file</span>
                    </Link>
                    {!isMainBranch(branchName) && goshWallet?.isDaoParticipant && (
                        <Link
                            to={`/${daoName}/${repoName}/blobs/create/${branch?.name}${
                                pathName && `/${pathName}`
                            }`}
                            className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                        >
                            <FontAwesomeIcon icon={faFileCirclePlus} />
                            <span className="hidden sm:inline-block ml-2">Add file</span>
                        </Link>
                    )}
                    <Menu as="div" className="relative">
                        <Menu.Button className="btn btn--body text-sm px-4 py-1.5 !font-normal">
                            <FontAwesomeIcon icon={faCode} />
                            <span className="hidden sm:inline-block ml-2">Code</span>
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                size="xs"
                                className="ml-2"
                            />
                        </Menu.Button>
                        <Transition
                            as={React.Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="dropdown-menu !py-4 max-w-264px sm:max-w-none">
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">
                                        <FontAwesomeIcon
                                            icon={faTerminal}
                                            className="mr-2"
                                        />
                                        Clone
                                    </h3>
                                    <div
                                        className="flex border border-gray-0a1124/65 rounded
                                        items-center text-gray-0a1124/65"
                                    >
                                        <div className="text-xs font-mono px-3 py-1 overflow-hidden whitespace-nowrap">
                                            gosh://
                                            {shortString(
                                                process.env.REACT_APP_GOSH_ADDR ?? ''
                                            )}
                                            /{daoName}/{repoName}
                                        </div>
                                        <CopyClipboard
                                            componentProps={{
                                                text: `gosh://${process.env.REACT_APP_GOSH_ADDR}/${daoName}/${repoName}`,
                                            }}
                                            iconContainerClassName="px-2 border-l border-gray-0a1124 hover:text-gray-0a1124"
                                            iconProps={{
                                                size: 'sm',
                                            }}
                                        />
                                    </div>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>

            <div className="mt-5">
                {subtree === undefined && (
                    <div className="text-gray-606060 text-sm">
                        <Spinner className="mr-3" />
                        Loading tree...
                    </div>
                )}

                {subtree && !subtree?.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no files yet
                    </div>
                )}

                {!!subtree && pathName && (
                    <Link
                        className="block py-3 border-b border-gray-300 font-medium"
                        to={`/${daoName}/${repoName}/tree/${branchName}${
                            dirUp && `/${dirUp}`
                        }`}
                    >
                        ..
                    </Link>
                )}
                <div className="divide-y divide-gray-c4c4c4">
                    {!!subtree &&
                        subtree?.map((item: any, index: number) => {
                            const path = [item.path, item.name]
                                .filter((part) => part !== '')
                                .join('/');
                            const type = item.type === 'tree' ? 'tree' : 'blobs';

                            return (
                                <div key={index} className="py-3">
                                    <Link
                                        className="hover:underline text-sm"
                                        to={`/${daoName}/${repoName}/${type}/${branchName}/${path}`}
                                    >
                                        <FontAwesomeIcon
                                            className="mr-2"
                                            icon={
                                                item.type === 'tree' ? faFolder : faFile
                                            }
                                            fixedWidth
                                        />
                                        {item.name}
                                    </Link>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default RepoPage;
