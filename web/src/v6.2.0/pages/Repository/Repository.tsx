import { faFile, faFolder } from '@fortawesome/free-regular-svg-icons'
import {
    faChevronDown,
    faCode,
    faCodeBranch,
    faFileCirclePlus,
    faTerminal,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Menu, Tab, Transition } from '@headlessui/react'
import { Buffer } from 'buffer'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import isUtf8 from 'isutf8'
import moment from 'moment'
import React, { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { TTreeItem, useBranches, usePush, useTree } from 'react-gosh'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSetRecoilState } from 'recoil'
import { AppConfig } from '../../../appconfig'
import CommitProgress from '../../../components/Commit/CommitProgress'
import CopyClipboard from '../../../components/CopyClipboard'
import { Button, ButtonLink } from '../../../components/Form'
import Loader from '../../../components/Loader'
import RepoBreadcrumbs from '../../../components/Repo/Breadcrumbs'
import { ToastError } from '../../../components/Toast'
import { GoshError } from '../../../errors'
import { onExternalLinkClick } from '../../../helpers'
import { appModalStateAtom } from '../../../store/app.state'
import { shortString } from '../../../utils'
import FileCommitChangesModal from '../../components/Modal/FileCommitChanges/FileCommitChanges'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useFileHistory, useRepository } from '../../hooks/repository.hooks'
import { ListItemSkeleton } from '../DaoRepositoryList/components'

const readFileAsBuffer = async (file: any) => {
    const content = await new Promise((resolve) => {
        let reader = new FileReader()
        reader.onload = () => {
            const buffer = Buffer.from(reader.result as Uint8Array)
            resolve(buffer)
        }
        reader.readAsArrayBuffer(file)
    })

    return content as Buffer
}

const buildPath = (dir: string, name: string) => {
    let path = `${dir}/${name}`
    path = path.replace('//', '/').replace(/^\//, '')
    return path
}

const RepositoryPage = () => {
    const url_params = useParams()
    const treepath = url_params['*'] || ''
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const repository = useRepository()
    // TODO: Remove after git refactor
    const { dao: _rg_dao, repository: _rg_repo, is_fetching } = useOutletContext<any>()
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
    const { push, progress: pushProgress } = usePush(
        _rg_dao.details,
        _rg_repo.adapter,
        url_params.branch,
    )
    // /Remove after git refactor
    const [dropped, setDropped] = useState<any[]>([])
    const [file_item, setFileItem] = useState<TTreeItem>()
    const [snapshot_path, setSnapshotPath] = useState<string>()
    const file_history = useFileHistory({ snapshot_path })
    const setModal = useSetRecoilState(appModalStateAtom)

    const onFilesDrop = useCallback((files: any) => {
        setDropped(files)
    }, [])
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        disabled: is_fetching || dropped.length > 0,
        noClick: true,
        onDrop: onFilesDrop,
    })

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

    const onClick = (item: TTreeItem) => {
        if (item.type === 'blob' || item.type === 'blobExecutable') {
            const branch = _rg_branch?.name || 'main'
            setFileItem(item)

            const path = buildPath(`${branch}/${item.commit}/${item.path}`, item.name)
            setSnapshotPath(path)
        } else {
            setFileItem(undefined)
            setSnapshotPath(undefined)
        }
    }

    const onFileHistoryItemClick = (item: any) => {
        setModal({
            static: true,
            isOpen: true,
            element: (
                <FileCommitChangesModal
                    history_item={item}
                    _rg_dao={_rg_dao.adapter}
                    _rg_repo={_rg_repo.adapter}
                />
            ),
        })
    }

    const uploadDropped = useCallback(async () => {
        if (!dropped.length) {
            return
        }

        try {
            if (!repository.details?.account || !_rg_repo.adapter) {
                throw new GoshError('Value error', 'Repository is undefined')
            }

            setFileItem(undefined)
            setSnapshotPath(undefined)
            const files: { path: string; content: string | Buffer }[] = []
            await Promise.all(
                dropped.map(async (file) => {
                    let content: string | Buffer = await readFileAsBuffer(file)
                    if (isUtf8(content)) {
                        content = Buffer.from(content).toString()
                    }
                    files.push({ path: file.path, content })
                }),
            )

            const push_blobs = await Promise.all(
                files.map(async (item) => {
                    const external_path = buildPath(treepath, item.path)
                    const tree_item = subtree?.find((v) => {
                        const path = buildPath(v.path, v.name)
                        return path === external_path
                    })
                    const exists_path = tree_item
                        ? buildPath(tree_item.path, tree_item.name)
                        : ''

                    let original = ''
                    if (tree_item && exists_path) {
                        const snapshot = await repository.details!.account!.getSnapshot({
                            data: {
                                commitname: tree_item.commit!,
                                filename: exists_path,
                            },
                        })
                        const { current } = await _rg_repo.adapter.getCommitBlob(
                            snapshot.address,
                            exists_path,
                            _rg_branch?.commit.name,
                        )
                        original = current
                    }

                    return {
                        treepath: [exists_path, external_path],
                        original,
                        modified: item.content,
                    }
                }),
            )
            console.debug('push_blobs', push_blobs)
            const comment = `Upload files to repository "${repository.details?.name}" branch "${_rg_branch?.name}"`
            const eventaddr = await push(comment, push_blobs, {
                isPullRequest: _rg_branch?.isProtected,
            })
            if (eventaddr) {
                navigate(`/o/${dao.details.name}/events/${eventaddr}`)
            }
        } catch (e: any) {
            console.error(e)
            toast.error(<ToastError error={e} />)
        } finally {
            setDropped([])
        }
    }, [dropped.length, _rg_branch?.isProtected, _rg_repo.adapter?.address])

    useEffect(() => {
        const _rgBranch = async () => {
            if (_rg_branch?.name && _rg_repo.adapter) {
                await updateBranch(_rg_branch.name)
            }
        }

        _rgBranch()
    }, [_rg_repo.details?.address, _rg_branch?.name, updateBranch])

    useEffect(() => {
        uploadDropped()
    }, [uploadDropped])

    return (
        <>
            <RepoBreadcrumbs
                daoName={dao.details.name}
                repoName={url_params.reponame}
                branchName={_rg_branch?.name}
                pathName={treepath}
            />

            <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 mb-4">
                    <ButtonLink
                        to={`/o/${dao.details.name}/r/${repository.details?.name}/branches`}
                        className="bg-transparent text-gray-7c8db5 hover:text-black mr-8
                            transition-colors duration-150 !px-0"
                        variant="custom"
                    >
                        <FontAwesomeIcon icon={faCodeBranch} className="mr-2" />
                        Branches
                    </ButtonLink>

                    <div className="flex items-center grow gap-3 justify-end">
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

                <div className="mt-10 flex flex-wrap lg:flex-nowrap gap-x-2 gap-y-10">
                    <div
                        className={classNames(
                            'basis-full lg:basis-0 grow transition-colors duration-200',
                            isDragActive ? 'bg-gray-2/50' : null,
                        )}
                        {...getRootProps()}
                    >
                        <input {...getInputProps()} />

                        {(repository.is_fetching ||
                            is_fetching ||
                            subtree === undefined) && <ListItemSkeleton />}

                        <div className="grid grid-cols-[repeat(auto-fill,7rem)] gap-7">
                            {!is_fetching &&
                                subtree?.map((item: any, index: number) => {
                                    const path = [item.path, item.name]
                                        .filter((part) => part !== '')
                                        .join('/')
                                    const type =
                                        item.type === 'tree' ? 'tree' : 'blobs/view'

                                    return (
                                        <button
                                            key={index}
                                            className="group block w-28 self-start"
                                            onClick={() => onClick(item)}
                                            onDoubleClick={() => {
                                                onDoubleClick(
                                                    `${type}/${_rg_branch?.name}/${path}`,
                                                )
                                            }}
                                        >
                                            <div
                                                className="p-5 text-center text-black-2 rounded-2xl overflow-hidden
                                                group-hover:bg-gray-1/50 group-focus:bg-gray-2 transition-colors
                                                duration-200"
                                            >
                                                <FontAwesomeIcon
                                                    icon={
                                                        type === 'tree'
                                                            ? faFolder
                                                            : faFile
                                                    }
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

                        {!repository.is_fetching &&
                            !is_fetching &&
                            subtree &&
                            !subtree?.length && (
                                <div className="text-sm text-gray-7c8db5 text-center py-3 min-h-[20rem]">
                                    <p>There are no files yet</p>
                                    <p>You can drag & drop files here to upload</p>
                                </div>
                            )}
                    </div>

                    <AnimatePresence>
                        {!!file_item && (
                            <motion.div
                                className="lg:max-w-xs grow basis-full lg:basis-4/12 xl:basis-2/12"
                                initial={{ opacity: 0, translateX: '100%' }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: '100%' }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="border border-gray-e6edff rounded-lg pt-5 bg-gray-fafafd overflow-hidden">
                                    <h4 className="px-5 text-lg font-medium text-gray-53596d">
                                        {file_item.name}
                                    </h4>
                                    <p className="px-5 text-xs text-gray-7c8db5">
                                        {file_item.path}/{file_item.name}
                                    </p>
                                    <Tab.Group as="div" className="mt-8">
                                        <Tab.List className="px-5">
                                            <Tab
                                                className="px-5 py-2 text-sm bg-white border-x border-t
                                                border-gray-e6edff rounded-t-lg"
                                            >
                                                Version history
                                            </Tab>
                                        </Tab.List>
                                        <Tab.Panels
                                            as="div"
                                            className="bg-white border-t border-gray-e6edff -mt-px p-5"
                                        >
                                            <Tab.Panel className="-mx-2">
                                                {file_history.is_fetching &&
                                                    !file_history.history.length && (
                                                        <Loader className="text-sm text-center text-gray-7c8db5">
                                                            Fetching file history...
                                                        </Loader>
                                                    )}
                                                {!file_history.is_fetching &&
                                                    !file_history.history.length && (
                                                        <p className="text-sm text-center text-gray-7c8db5">
                                                            File has no changes yet
                                                        </p>
                                                    )}
                                                {file_history.history.map(
                                                    (item, index) => (
                                                        <div
                                                            key={index}
                                                            className="p-2 rounded-md hover:bg-gray-fafafd
                                                            transition-colors duration-200 cursor-pointer"
                                                            onClick={() =>
                                                                onFileHistoryItemClick(
                                                                    item,
                                                                )
                                                            }
                                                        >
                                                            <div className="text-sm text-gray-53596d">
                                                                {moment
                                                                    .unix(item.created_at)
                                                                    .format(
                                                                        'MMM D, YYYY HH:mm',
                                                                    )}
                                                            </div>
                                                            <div className="text-xs text-gray-7c8db5">
                                                                Commit:{' '}
                                                                {shortString(
                                                                    item.commit_name,
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}

                                                {file_history.has_next && (
                                                    <div className="mt-3 text-center">
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            disabled={
                                                                file_history.is_fetching
                                                            }
                                                            isLoading={
                                                                file_history.is_fetching
                                                            }
                                                            onClick={file_history.getNext}
                                                        >
                                                            Load more
                                                        </Button>
                                                    </div>
                                                )}
                                            </Tab.Panel>
                                        </Tab.Panels>
                                    </Tab.Group>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {dropped.length > 0 && (
                <div className="fixed bottom-2 right-2">
                    <CommitProgress {...pushProgress} className="!text-xs" />
                </div>
            )}
        </>
    )
}

export default RepositoryPage
