import React, { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faClockRotateLeft,
    faCodeBranch,
    faFolder,
    faRightLong,
    faMagnifyingGlass,
    faFileCirclePlus,
    faCode,
    faChevronDown,
    faTerminal,
} from '@fortawesome/free-solid-svg-icons'
import Spinner from '../../components/Spinner'
import { AppConfig, classNames, splitByPath, useBranches, useTree } from 'react-gosh'
import { faFile } from '@fortawesome/free-regular-svg-icons'
import { Menu, Transition } from '@headlessui/react'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import { BranchSelect } from '../../components/Branches'
import RepoReadme from './Readme'
import { onExternalLinkClick } from '../../helpers'

const RepoPage = () => {
    const treepath = useParams()['*'] || ''
    const { daoName, repoName, branchName } = useParams()
    const navigate = useNavigate()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const { branches, branch, updateBranch } = useBranches(repository.adapter, branchName)
    const { subtree, blobs } = useTree(daoName!, repoName!, branch?.commit, treepath)

    const [dirUp] = splitByPath(treepath)

    const getRemoteUrl = (short: boolean): string => {
        const goshAddress = AppConfig.versions[repository.details.version]
        const goshstr = short ? shortString(goshAddress) : goshAddress
        return `gosh://${goshstr}/${daoName}/${repoName}`
    }

    useEffect(() => {
        if (!branchName) {
            navigate(`/o/${daoName}/r/${repoName}/tree/${repository.details.head}`)
        } else {
            updateBranch(branchName)
        }
    }, [daoName, repoName, branchName, repository.details.head, navigate, updateBranch])

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
                <div className="grow flex items-center gap-y-2 gap-x-5">
                    <BranchSelect
                        branch={branch}
                        branches={branches}
                        onChange={(selected) => {
                            if (selected) {
                                navigate(
                                    `/o/${daoName}/r/${repoName}/tree/${selected.name}`,
                                )
                            }
                        }}
                    />

                    <Link
                        to={`/o/${daoName}/r/${repoName}/branches`}
                        className="block text-sm text-gray-050a15/65 hover:text-gray-050a15"
                    >
                        <span className="font-semibold">
                            <FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
                            {branches.length}
                        </span>
                        <span className="hidden sm:inline-block ml-1">branches</span>
                    </Link>

                    <Link
                        to={`/o/${daoName}/r/${repoName}/commits/${branch?.name}`}
                        className="block text-sm text-gray-050a15/65 hover:text-gray-050a15"
                    >
                        <FontAwesomeIcon icon={faClockRotateLeft} />
                        <span className="hidden sm:inline-block ml-1">History</span>
                    </Link>
                </div>

                <div className="flex grow gap-3 justify-end">
                    <Link
                        to={`/o/${daoName}/r/${repoName}/find/${branch?.name}`}
                        className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <span className="hidden sm:inline-block ml-2">Go to file</span>
                    </Link>
                    {!branch?.isProtected && dao.details.isAuthMember && (
                        <Link
                            to={`/o/${daoName}/r/${repoName}/blobs/create/${
                                branch?.name
                            }${treepath && `/${treepath}`}`}
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
                            <Menu.Items className="dropdown-menu !bg-white !py-4 max-w-264px sm:max-w-none">
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">
                                        <FontAwesomeIcon
                                            icon={faTerminal}
                                            className="mr-2"
                                        />
                                        Clone
                                    </h3>
                                    <div>
                                        <div
                                            className={classNames(
                                                'flex items-center',
                                                'border border-gray-0a1124/65 rounded',
                                                'text-gray-0a1124/65',
                                            )}
                                        >
                                            <div
                                                className={classNames(
                                                    'overflow-hidden whitespace-nowrap',
                                                    'text-xs font-mono px-3 py-1',
                                                )}
                                            >
                                                {getRemoteUrl(true)}
                                            </div>
                                            <CopyClipboard
                                                componentProps={{
                                                    text: getRemoteUrl(false),
                                                }}
                                                iconContainerClassName={classNames(
                                                    'px-2 border-l border-gray-0a1124',
                                                    'hover:text-gray-0a1124',
                                                )}
                                                iconProps={{ size: 'sm' }}
                                            />
                                        </div>

                                        <div className="mt-3 text-right text-xs text-gray-7c8db5">
                                            <a
                                                href="https://docs.gosh.sh/working-with-gosh/git-remote-helper/"
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => {
                                                    onExternalLinkClick(
                                                        e,
                                                        'https://docs.gosh.sh/working-with-gosh/git-remote-helper/',
                                                    )
                                                }}
                                            >
                                                How to setup git remote helper?
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>

            <div className="mt-4">
                {subtree === undefined && (
                    <div className="text-gray-606060 text-sm py-3">
                        <Spinner className="mr-3" />
                        Loading tree...
                    </div>
                )}

                {!!subtree && treepath && (
                    <Link
                        className="block py-3 border-b border-gray-300 font-medium"
                        to={`/o/${daoName}/r/${repoName}/tree/${branchName}${
                            dirUp && `/${dirUp}`
                        }`}
                    >
                        ..
                    </Link>
                )}
                <div className="divide-y divide-gray-c4c4c4 mb-5">
                    {subtree?.map((item: any, index: number) => {
                        const path = [item.path, item.name]
                            .filter((part) => part !== '')
                            .join('/')
                        const type = item.type === 'tree' ? 'tree' : 'blobs/view'

                        if (item.type === 'commit') {
                            return (
                                <div key={index} className="py-3">
                                    <span className="fa-layers fa-fw mr-2">
                                        <FontAwesomeIcon icon={faFolder} size="1x" />
                                        <FontAwesomeIcon
                                            icon={faRightLong}
                                            transform="shrink-6 down-1"
                                            inverse
                                        />
                                    </span>
                                    <span className="text-sm">{item.name}</span>
                                </div>
                            )
                        }

                        return (
                            <div key={index} className="py-3">
                                <Link
                                    className="hover:underline"
                                    to={`/o/${daoName}/r/${repoName}/${type}/${branchName}/${path}`}
                                >
                                    <FontAwesomeIcon
                                        className="mr-2"
                                        icon={item.type === 'tree' ? faFolder : faFile}
                                        size="1x"
                                        fixedWidth
                                    />
                                    <span className="text-sm">{item.name}</span>
                                </Link>
                            </div>
                        )
                    })}
                </div>

                {subtree && !subtree?.length && (
                    <div className="text-sm text-gray-606060 text-center py-3">
                        There are no files yet
                    </div>
                )}

                <RepoReadme
                    className="border rounded overflow-hidden"
                    dao={daoName!}
                    repo={repoName!}
                    branch={branch!.name}
                    blobs={blobs || []}
                />
            </div>
        </div>
    )
}

export default RepoPage
