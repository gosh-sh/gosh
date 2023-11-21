import { faFile, faFolder } from '@fortawesome/free-regular-svg-icons'
import {
    faChevronDown,
    faCode,
    faFileCirclePlus,
    faTerminal,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Menu, Transition } from '@headlessui/react'
import React, { useEffect } from 'react'
import { useBranches, useTree } from 'react-gosh'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { AppConfig } from '../../../appconfig'
import CopyClipboard from '../../../components/CopyClipboard'
import { Button, ButtonLink } from '../../../components/Form'
import RepoBreadcrumbs from '../../../components/Repo/Breadcrumbs'
import { onExternalLinkClick } from '../../../helpers'
import { shortString } from '../../../utils'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useRepository } from '../../hooks/repository.hooks'
import { ListItemSkeleton } from '../DaoRepositoryList/components'

const RepositoryPage = () => {
    const url_params = useParams()
    const treepath = url_params['*'] || ''
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const repository = useRepository()
    // TODO: Remove after git refactor
    const { dao: _rg_dao, repository: _rg_repo } = useOutletContext<any>()
    const { branch: _rg_branch, updateBranch } = useBranches(
        _rg_repo.adapter,
        url_params.branch,
    )
    const { subtree } = useTree(
        url_params.daoname!,
        url_params.reponame!,
        _rg_branch?.commit,
        treepath,
    )

    const getRemoteUrl = (short: boolean) => {
        if (repository.details?.version) {
            const goshaddr = AppConfig.getVersions()[repository.details.version]
            const goshstr = short ? shortString(goshaddr) : goshaddr
            return `gosh://${goshstr}/${dao.details.name}/${repository.details.name}`
        }
        return ''
    }

    const onDoubleClick = (path: string) => {
        navigate(`/o/${dao.details.name}/r/${repository.details?.name}/${path}`)
    }

    useEffect(() => {
        const _rgBranch = async () => {
            if (_rg_branch?.name && _rg_repo.adapter) {
                await updateBranch(_rg_branch.name)
            }
        }

        _rgBranch()
    }, [_rg_repo.details?.address, _rg_branch?.name, updateBranch])

    return (
        <>
            <RepoBreadcrumbs
                daoName={dao.details.name}
                repoName={repository.details?.name}
                branchName={_rg_branch?.name}
                pathName={treepath}
            />

            <div className="mt-4 flex flex-wrap lg:flex-nowrap">
                <div className="grow">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 mb-4">
                        <div className="flex grow gap-3 justify-end">
                            {member.isMember && (
                                <ButtonLink
                                    to={`/o/${dao.details.name}/r/${repository.details?.name}/blobs/create/${_rg_branch?.name}/${treepath}`}
                                    variant="outline-secondary"
                                    test-id="link-file-create"
                                    disabled={!_rg_branch || _rg_branch.isProtected}
                                >
                                    <FontAwesomeIcon icon={faFileCirclePlus} />
                                    <span className="hidden sm:inline-block ml-2">
                                        Add file
                                    </span>
                                </ButtonLink>
                            )}
                            <Menu as="div" className="relative">
                                <Menu.Button as="div">
                                    <Button
                                        variant="outline-secondary"
                                        test-id="btn-clone-trigger"
                                    >
                                        <FontAwesomeIcon icon={faCode} />
                                        <span className="hidden sm:inline-block ml-2">
                                            Clone
                                        </span>
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            size="xs"
                                            className="ml-2"
                                        />
                                    </Button>
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
                                    <Menu.Items
                                        className="dropdown-menu !bg-white px-6 !py-4 max-w-264px sm:max-w-none
                                    absolute top-full right-0 border border-gray-e6edff rounded-lg"
                                    >
                                        <div>
                                            <h3 className="text-sm font-semibold mb-2">
                                                <FontAwesomeIcon
                                                    icon={faTerminal}
                                                    className="mr-2"
                                                />
                                                Clone
                                            </h3>
                                            <div>
                                                <div className="flex items-center border border-gray-0a1124/65 rounded text-gray-0a1124/65">
                                                    <div className="overflow-hidden whitespace-nowrap text-xs font-mono px-3 py-1">
                                                        {getRemoteUrl(true)}
                                                    </div>
                                                    <CopyClipboard
                                                        componentProps={{
                                                            text: getRemoteUrl(false),
                                                        }}
                                                        iconContainerClassName="px-2 border-l border-gray-0a1124 hover:text-gray-0a1124"
                                                        iconProps={{ size: 'sm' }}
                                                        testId="btn-copy-clone"
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

                    {subtree === undefined && <ListItemSkeleton />}

                    <div className="grid grid-flow-col auto-cols-min gap-7">
                        {subtree?.map((item: any, index: number) => {
                            const path = [item.path, item.name]
                                .filter((part) => part !== '')
                                .join('/')
                            const type = item.type === 'tree' ? 'tree' : 'blobs/view'

                            return (
                                <button
                                    key={index}
                                    className="group block w-28 self-start"
                                    onDoubleClick={() => {
                                        onDoubleClick(
                                            `${type}/${_rg_branch?.name}/${path}`,
                                        )
                                    }}
                                >
                                    <div
                                        className="p-5 text-center text-black-2 rounded-2xl overflow-hidden
                                    group-hover:bg-gray-1/50 group-focus:bg-gray-2 transition-colors duration-200"
                                    >
                                        <FontAwesomeIcon
                                            icon={type === 'tree' ? faFolder : faFile}
                                            size="4x"
                                        />
                                    </div>
                                    <div
                                        className="mt-2 px-2 py-1 text-sm text-center overflow-hidden text-ellipsis
                                    rounded-lg text-black-2 group-focus:bg-blue-1 group-focus:text-white
                                    group-focus:break-words"
                                    >
                                        {item.name}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {subtree && !subtree?.length && (
                        <div className="text-sm text-gray-7c8db5 text-center py-3">
                            There are no files yet
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default RepositoryPage
