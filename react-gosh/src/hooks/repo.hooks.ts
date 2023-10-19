import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { MAX_PARALLEL_READ, ZERO_COMMIT } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { GoshAdapterFactory } from '../gosh'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from '../gosh/interfaces'
import { executeByChunk, getRepositoryAccounts, getTreeItemFullPath } from '../helpers'
import {
    branchesAtom,
    branchSelector,
    daoAtom,
    repositoryAtom,
    treeAtom,
    treeSelector,
} from '../store'
import { TAddress, TDao } from '../types'
import {
    TBranch,
    TBranchCompareProgress,
    TBranchOperateProgress,
    TCommit,
    TPushProgress,
    TRepositoryListItem,
    TTaskCommitConfig,
    TTree,
    TTreeItem,
} from '../types/repo.types'
import { sleep, whileFinite } from '../utils'

function useRepoList(dao: string, params: { perPage?: number; version?: string }) {
    const [search, setSearch] = useState<string>('')
    const [accounts, setAccounts] = useState<{
        isFetching: boolean
        items: { address: TAddress; last_paid: number; version: string }[]
    }>({ isFetching: false, items: [] })
    const [repos, setRepos] = useState<{
        isFetching: boolean
        items: TRepositoryListItem[]
        lastAccountIndex: number
        hasNext?: boolean
    }>({ isFetching: false, items: [], lastAccountIndex: 0 })

    const { perPage = 5, version } = params

    const getAccounts = useCallback(async () => {
        setAccounts((state) => ({ ...state, isFetching: true }))
        const items = await getRepositoryAccounts(dao, { version })
        setAccounts((state) => ({
            ...state,
            isFetching: false,
            items: items.sort((a, b) => b.last_paid - a.last_paid),
        }))
    }, [dao])

    const getRepositoryList = useCallback(
        async (lastAccountIndex: number, names: string[]) => {
            if (accounts.isFetching) {
                return
            }

            setRepos((state) => ({ ...state, isFetching: true }))

            const _names = [...names]
            const items: TRepositoryListItem[] = []
            for (let i = lastAccountIndex; i < accounts.items.length; i++) {
                lastAccountIndex = i
                const account = accounts.items[i]
                const gosh = GoshAdapterFactory.create(account.version)
                const repository = await gosh.getRepository({ address: account.address })
                const name = await repository.getName()
                if (_names.findIndex((n) => n === name) >= 0) {
                    continue
                }

                _names.push(name)
                items.push({
                    adapter: repository,
                    address: account.address,
                    name,
                    version: account.version,
                })

                if (perPage > 0 && items.length === perPage) {
                    break
                }
            }

            setRepos((state) => ({
                ...state,
                isFetching: false,
                items: [...state.items, ...items],
                lastAccountIndex,
                hasNext: lastAccountIndex < accounts.items.length - 1,
            }))

            for (const item of items) {
                getItemDetails(item)
            }
        },
        [accounts.isFetching, accounts.items, perPage],
    )

    const getMore = async () => {
        await getRepositoryList(
            repos.lastAccountIndex + 1,
            repos.items.map(({ name }) => name),
        )
    }

    const getItemDetails = async (item: TRepositoryListItem) => {
        if (item.isLoadDetailsFired) {
            return
        }

        setRepos((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const details = await item.adapter.getDetails()
        setRepos((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, ...details }
                }
                return curr
            }),
        }))
    }

    /** Get all repositories accounts from all GOSH versions */
    useEffect(() => {
        getAccounts()
    }, [getAccounts])

    /** Get repositories list per page */
    useEffect(() => {
        getRepositoryList(0, [])
    }, [getRepositoryList])

    return {
        isFetching: accounts.isFetching || repos.isFetching,
        isEmpty: !accounts.isFetching && !repos.isFetching && !repos.items.length,
        items: repos.items,
        hasNext: repos.hasNext,
        search,
        setSearch,
        getMore,
        getItemDetails,
    }
}

function useRepo(dao: string, repo: string) {
    const [daoDetails, setDaoDetails] = useRecoilState(daoAtom)
    const [daoAdapter, setDaoAdapter] = useState<IGoshDaoAdapter>()
    const [repository, setRepository] = useRecoilState(repositoryAtom)
    const [isFetching, setIsFetching] = useState<boolean>(true)

    useEffect(() => {
        const _getRepo = async () => {
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                const daoInstance = await gosh.getDao({ name: dao })
                if (!(await daoInstance.isDeployed())) continue

                const repoInstance = await daoInstance.getRepository({ name: repo })
                if (await repoInstance.isDeployed()) {
                    const daoDetails = await daoInstance.getDetails()
                    const repoDetails = await repoInstance.getDetails()

                    setDaoAdapter(daoInstance)
                    setDaoDetails(daoDetails)
                    setRepository({
                        isFetching: false,
                        adapter: repoInstance,
                        details: repoDetails,
                    })
                    setIsFetching(false)
                    break
                }
            }
        }

        _getRepo()
    }, [dao, repo])

    // TODO: Fix this
    // useEffect(() => {
    //     const _getIncomingCommits = async () => {
    //         if (!repository.adapter) return

    //         const incoming = await repository.adapter.getIncomingCommits()
    //         setRepository((state) => {
    //             const { details } = state
    //             if (!details) return state
    //             return {
    //                 ...state,
    //                 details: { ...details, commitsIn: incoming },
    //             }
    //         })
    //     }

    //     _getIncomingCommits()
    //     repository.adapter?.subscribeIncomingCommits((incoming) => {
    //         setRepository((state) => {
    //             const { details } = state
    //             if (!details) return state
    //             return {
    //                 ...state,
    //                 details: { ...details, commitsIn: incoming },
    //             }
    //         })
    //     })

    //     return () => {
    //         repository.adapter?.unsubscribe()
    //     }
    // }, [repository.adapter])

    return {
        isFetching,
        dao: {
            adapter: daoAdapter,
            details: daoDetails,
        },
        repository,
    }
}

function useRepoCreate(dao: IGoshDaoAdapter) {
    const create = async (name: string, options: { description?: string }) => {
        await dao.createRepository({ name, ...options })
    }

    return { create }
}

function useRepoUpgrade(dao: IGoshDaoAdapter, repo: IGoshRepositoryAdapter) {
    const [versions, setVersions] = useState<string[]>()

    const all = Object.keys(AppConfig.versions)

    useEffect(() => {
        const _getAvailableVersions = () => {
            const daoIndex = all.findIndex((v) => v === dao.getVersion())
            const repoIndex = all.findIndex((v) => v === repo.getVersion())
            // TODO: Check DAO version
            // setVersions(all.slice(repoIndex + 1, daoIndex))
            setVersions(all.slice(repoIndex + 1))
        }

        _getAvailableVersions()
    }, [repo])

    const upgrade = async (dao: string, version: string) => {
        if (all.indexOf(version) < 0) {
            throw new GoshError(`Gosh version ${version} is not supported`)
        }

        const gosh = GoshAdapterFactory.create(version)
        const adapter = await gosh.getDao({ name: dao })
        await adapter.createRepository({
            name: await repo.getName(),
            prev: {
                addr: repo.getAddress(),
                version: repo.getVersion(),
            },
        })
    }

    return { versions, upgrade }
}

function useBranches(repo?: IGoshRepositoryAdapter, current: string = 'main') {
    const [branches, setBranches] = useRecoilState(branchesAtom)
    const branch = useRecoilValue(branchSelector(current))

    const updateBranches = useCallback(async () => {
        if (!repo) {
            return
        }

        const branches = await repo.getBranches()
        if (branches) {
            setBranches(branches)
        }
    }, [repo, setBranches])

    const updateBranch = useCallback(
        async (name: string) => {
            if (!repo) {
                return
            }

            console.debug('Update branch', name)
            const branch = await repo.getBranch(name)
            if (branch) {
                setBranches((currVal) =>
                    currVal.map((item) => (item.name !== branch.name ? item : branch)),
                )
            }
        },
        [repo, setBranches],
    )

    return { branches, branch, updateBranch, updateBranches }
}

function useBranchManagement(dao: TDao, repo: IGoshRepositoryAdapter) {
    const setRepository = useSetRecoilState(repositoryAtom)
    const { updateBranches } = useBranches(repo)
    const { pushUpgrade, progress: pushProgress } = usePush(dao, repo)
    const [progress, setProgress] = useState<{
        name?: string
        type?: 'create' | 'destroy' | '(un)lock' | 'sethead'
        isFetching: boolean
        details: TBranchOperateProgress
    }>({ isFetching: false, details: {} })

    const create = async (name: string, from: string) => {
        try {
            setProgress({ type: 'create', isFetching: true, details: {} })

            const branch = await repo.getBranch(from)

            /**
             * For version 6.1.0
             * If last commit in branch is initupgrade commit with `isCorrectCommit=false`,
             * show message, that this branch has to receive common repair commit
             */
            if (
                repo.getVersion() === '6.1.0' &&
                branch.commit.version <= '5.1.0' &&
                !branch.commit.correct
            ) {
                throw new GoshError(
                    'Consistency error',
                    `Branch ${branch.name} should be repaired. Please unlock (if locked) branch ${branch.name} and push any commit. Then branch can be made protected again`,
                )
            }

            // Common flow
            await pushUpgrade(branch.name, branch.commit.name, branch.commit.version)
            await repo.createBranch(
                name.toLowerCase(),
                from.toLowerCase(),
                _branchOperateCallback,
            )
            await updateBranches()
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const destroy = async (name: string) => {
        try {
            setProgress({ name, type: 'destroy', isFetching: true, details: {} })
            await repo.deleteBranch(name.toLowerCase(), _branchOperateCallback)
            await updateBranches()
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const lock = async (name: string) => {
        try {
            setProgress({ name, type: '(un)lock', isFetching: true, details: {} })
            await repo.lockBranch({
                repository: await repo.getName(),
                branch: name.toLowerCase(),
            })
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const unlock = async (name: string) => {
        try {
            setProgress({ name, type: '(un)lock', isFetching: true, details: {} })
            await repo.unlockBranch({
                repository: await repo.getName(),
                branch: name.toLowerCase(),
            })
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const sethead = async (name: string) => {
        try {
            setProgress({ name, type: 'sethead', isFetching: true, details: {} })
            await repo.setHead(name)
            setRepository((state) => {
                const { details } = state
                if (!details) return state
                return {
                    ...state,
                    details: { ...details, head: name },
                }
            })
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const _branchOperateCallback = (params: TBranchOperateProgress) => {
        setProgress((currVal) => {
            const { details } = currVal
            const { snapshotsWrite } = params
            return {
                ...currVal,
                details: {
                    ...details,
                    ...params,
                    snapshotsWrite: { ...details.snapshotsWrite, ...snapshotsWrite },
                },
            }
        })
    }

    return { create, destroy, lock, unlock, sethead, progress, pushProgress }
}

function useTree(dao: string, repo: string, commit?: TCommit, treepath?: string) {
    const [tree, setTree] = useRecoilState(treeAtom)
    const subtree = useRecoilValue(treeSelector({ type: 'tree', path: treepath }))
    const blobs = useRecoilValue(treeSelector({ type: 'blobs', path: treepath }))

    useEffect(() => {
        const _getTree = async () => {
            let newtree: { tree: TTree; items: TTreeItem[] } = {
                tree: { '': [] },
                items: [],
            }

            if (!commit || commit.name === ZERO_COMMIT) {
                setTree(newtree)
                return
            }

            setTree(undefined)
            const gosh = GoshAdapterFactory.create(commit.version)
            const adapter = await gosh.getRepository({ path: `${dao}/${repo}` })
            newtree = await adapter.getTree(commit, treepath)
            setTree(newtree)
        }

        _getTree()
    }, [dao, repo, commit?.name, commit?.version, treepath, setTree])

    return { tree, subtree, blobs }
}

function useBlob(dao: string, repo: string, branch?: string, path?: string) {
    const { branch: branchData } = useBranches(undefined, branch)
    const [blob, setBlob] = useState<{
        address?: string
        commit?: string
        path?: string
        content?: string | Buffer
        isFetching: boolean
    }>({ isFetching: true })

    useEffect(() => {
        const _getBlob = async () => {
            setBlob({ isFetching: true })

            if (!branchData || !path) {
                setBlob({ isFetching: false })
                return
            }
            if (branchData.commit.name === ZERO_COMMIT) {
                setBlob({ isFetching: false })
                return
            }

            const gosh = GoshAdapterFactory.create(branchData.commit.version)
            const adapter = await gosh.getRepository({ path: `${dao}/${repo}` })

            let snapshot: any
            if (adapter.getVersion() < '6.0.0') {
                const _snapshot = await adapter.getBlob({
                    commit: branchData.commit.name,
                    fullpath: `${branchData.name}/${path}`,
                })
                snapshot = {
                    address: _snapshot.address,
                    commit: _snapshot.onchain.commit,
                    content: _snapshot.content,
                }
            } else {
                const tree = await adapter.getTree(branchData.commit.name, path)
                const item = tree.items.find((item) => getTreeItemFullPath(item) === path)
                const { value0 } = await adapter.repo.runLocal(
                    'getSnapshotAddr',
                    { commitsha: item?.commit, name: path },
                    undefined,
                    { useCachedBoc: true },
                )
                const { current } = await adapter.getCommitBlob(
                    value0,
                    path,
                    branchData.commit.name,
                )
                snapshot = {
                    address: value0,
                    commit: branchData.commit.name,
                    content: current,
                }
            }

            setBlob((state) => ({
                ...state,
                ...snapshot,
                path,
                isFetching: false,
            }))
        }

        _getBlob()
    }, [repo, branch, path])

    return blob
}

function useCommitList(
    dao: string,
    repo: IGoshRepositoryAdapter,
    branch: string,
    perPage: number,
) {
    const { branch: branchData, updateBranch } = useBranches(repo, branch)
    const [isBranchUpdated, setIsBranchUpdated] = useState<boolean>(false)
    const [adapter, setAdapter] = useState<IGoshRepositoryAdapter>(repo)
    const [commits, setCommits] = useState<{
        list: TCommit[]
        isFetching: boolean
        prev?: { address: TAddress; version: string }
    }>({
        list: [],
        isFetching: true,
    })

    const _getCommit = async (commit: { address: TAddress; version: string }) => {
        const { address, version } = commit

        let vAdapter = adapter
        if (vAdapter.getVersion() !== version) {
            const gosh = GoshAdapterFactory.create(version)
            const name = await adapter.getName()
            vAdapter = await gosh.getRepository({ path: `${dao}/${name}` })
            console.debug('useCommitList set new adapter')
            setAdapter(vAdapter)
        }

        return await vAdapter.getCommit({ address })
    }

    const _getCommitsPage = async (prev?: { address: TAddress; version: string }) => {
        setCommits((curr) => ({ ...curr, isFetching: true }))

        const list: TCommit[] = []
        let count = 0
        while (count < perPage) {
            if (!prev) {
                break
            }

            const commit = await _getCommit(prev)
            const { name, initupgrade, parents } = commit
            if (name !== ZERO_COMMIT && !initupgrade) {
                list.push(commit)
            }
            if (name === ZERO_COMMIT || !parents.length) {
                prev = undefined
                break
            }

            const parent = parents[0]
            prev = { address: parent.address, version: parent.version }
            count++
            await sleep(50)
        }

        setCommits((curr) => ({
            list: [...curr.list, ...list],
            isFetching: false,
            prev,
        }))
    }

    const getMore = async () => {
        await _getCommitsPage(commits.prev)
    }

    useEffect(() => {
        const _updateBranch = async () => {
            setCommits({ list: [], isFetching: true })
            setIsBranchUpdated(false)
            await updateBranch(branch)
            setIsBranchUpdated(true)
        }

        _updateBranch()
    }, [branch])

    useEffect(() => {
        const _getCommits = async () => {
            if (!isBranchUpdated) {
                return
            }
            if (branchData) {
                const { address, version } = branchData.commit
                _getCommitsPage({ address, version })
            }
        }

        _getCommits()
    }, [isBranchUpdated])

    return {
        isFetching: commits.isFetching,
        isEmpty: !commits.list.length,
        items: commits.list,
        hasMore: !!commits.prev,
        getMore,
    }
}

function _useCommit(dao: string, repo: string, commit: string) {
    const [adapter, setAdapter] = useState<IGoshRepositoryAdapter>()
    const [details, setDetails] = useState<{ isFetching: boolean; commit?: TCommit }>({
        isFetching: true,
    })

    useEffect(() => {
        const _getCommit = async () => {
            setDetails((state) => ({ ...state, isFetching: true }))
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                const repository = await gosh.getRepository({ path: `${dao}/${repo}` })
                try {
                    const data = await repository.getCommit({ name: commit })
                    if (data.initupgrade) continue

                    setAdapter(repository)
                    setDetails((state) => ({ ...state, commit: data, isFetching: false }))
                    break
                } catch (e: any) {
                    console.info('Find commit', e.message)
                }
            }
        }

        _getCommit()
    }, [dao, repo, commit])

    return {
        repository: adapter,
        commit: details,
    }
}

function useCommit(
    dao: string,
    repo: string,
    branch: string,
    commit: string,
    showDiffNum: number = 5,
) {
    const { repository, commit: details } = _useCommit(dao, repo, commit)
    const [blobs, setBlobs] = useState<{
        isFetching: boolean
        items: {
            address: string
            treepath: string
            commit: TCommit
            current: string | Buffer
            previous: string | Buffer
            showDiff: boolean
            isFetching: boolean
        }[]
    }>({ isFetching: true, items: [] })

    const getDiff = async (index: number) => {
        if (!repository) return

        setBlobs((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                return i === index ? { ...item, isFetching: true } : item
            }),
        }))

        const { commit, treepath, address } = blobs.items[index]
        const diff = await repository.getCommitBlob(address, treepath, commit)

        setBlobs((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                return i === index
                    ? { ...item, ...diff, isFetching: false, showDiff: true }
                    : item
            }),
        }))
    }

    useEffect(() => {
        const _getBlobs = async () => {
            if (!repository || !details.commit) return

            setBlobs({ isFetching: true, items: [] })
            const blobs = await repository.getCommitBlobs(branch, details.commit)
            const state = await Promise.all(
                blobs.sort().map(async ({ address, treepath }, i) => {
                    const diff =
                        i < showDiffNum
                            ? await repository.getCommitBlob(
                                  address,
                                  treepath,
                                  details.commit!,
                              )
                            : { previous: '', current: '' }
                    return {
                        treepath,
                        address,
                        commit: details.commit!,
                        ...diff,
                        showDiff: i < showDiffNum,
                        isFetching: false,
                    }
                }),
            )
            setBlobs({ isFetching: false, items: state })
        }

        _getBlobs()
    }, [repository, branch, details.commit])

    return {
        isFetching: details.isFetching,
        commit: details.commit,
        blobs: {
            isFetching: blobs.isFetching,
            items: blobs.items,
            getDiff,
        },
    }
}

function usePush(dao: TDao, repo: IGoshRepositoryAdapter, branchName?: string) {
    const { branch, updateBranch } = useBranches(repo, branchName)
    const [progress, setProgress] = useState<TPushProgress>({})

    const push = async (
        title: string,
        blobs: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
        }[],
        options: {
            isPullRequest?: boolean
            message?: string
            tags?: string
            parent?: string
            task?: TTaskCommitConfig
        },
    ) => {
        if (!repo.auth) {
            throw new GoshError('Auth error', 'DAO wallet undefined')
        }
        if (!branch) {
            throw new GoshError(EGoshError.NO_BRANCH)
        }
        if (!dao.isAuthMember) {
            throw new GoshError(EGoshError.NOT_MEMBER)
        }

        const { message, tags, parent, task, isPullRequest = false } = options
        const { name, version } = branch.commit

        /**
         * For version 6.1.0
         * If last commit in branch is initupgrade commit with `isCorrectCommit=false`,
         * find previous correct commit, create temporary branch from that commit,
         * delete current push branch, create current push branch from temporary
         */
        if (
            repo.getVersion() === '6.1.0' &&
            branch.commit.version <= '5.1.0' &&
            !branch.commit.correct
        ) {
            console.debug('[REPAIR BRANCH]', branch.name)

            // Check if current push branch is not protected
            if (branch.isProtected) {
                throw new GoshError(
                    'Access error',
                    `Branch ${branch.name} should be repaired, but is protected. Please unlock branch ${branch.name} and push any commit. Then branch can be made protected again`,
                )
            }

            // Find correct commit
            const reponame = await repo.getName()
            let repairRepo = repo
            let repairCommit = branch.commit
            while (!repairCommit.correct) {
                const _parent = branch.commit.parents[0]
                if (!_parent) {
                    throw new GoshError('Value error', 'Correct commit not found')
                }

                const _gosh = GoshAdapterFactory.create(_parent.version)
                repairRepo = await _gosh.getRepository({
                    path: `${dao.name}/${reponame}`,
                })
                repairCommit = await repairRepo.getCommit({ address: _parent.address })
                if (repairCommit.name === ZERO_COMMIT) {
                    throw new GoshError('Value error', 'Correct commit not found')
                }
            }

            // Deploy upgrade commit (without setCommit)
            const upgradeData = await repairRepo.getUpgrade(repairCommit.name)
            const repairCommitAcc = await repo._getCommit({ name: repairCommit.name })
            await repo.pushUpgrade(upgradeData, { setCommit: false })
            const waitRepairCommit = await whileFinite(async () => {
                return await repairCommitAcc.isDeployed()
            })
            if (!waitRepairCommit) {
                throw new GoshError('Create repair upgrade commit timeout reached')
            }

            // Create repair branch from correct commit
            const repairBranch = `${branch.name}-recover__system`
            await repo.auth.wallet0.run('deployBranch', {
                repoName: reponame,
                newName: repairBranch,
                fromCommit: repairCommit.name,
            })
            const waitRepairBranch = await whileFinite(async () => {
                const { branchname } = await repo._getBranch(repairBranch)
                return branchname === repairBranch
            })
            if (!waitRepairBranch) {
                throw new GoshError('Create repair branch timeout reached')
            }

            // Delete current push branch
            await repo.auth.wallet0.run('deleteBranch', {
                repoName: reponame,
                Name: branch.name,
            })
            const waitDeleteBranch = await whileFinite(async () => {
                const { branchname } = await repo._getBranch(branch.name)
                return !branchname
            })
            if (!waitDeleteBranch) {
                throw new GoshError('Delete original branch timeout reached')
            }

            // Create current push branch from repair branch
            await repo.auth.wallet0.run('deployBranch', {
                repoName: reponame,
                newName: branch.name,
                fromCommit: repairCommit.name,
            })
            const waitOriginalBranch = await whileFinite(async () => {
                const { branchname } = await repo._getBranch(branch.name)
                return branchname === branch.name
            })
            if (!waitOriginalBranch) {
                throw new GoshError('Create original branch timeout reached')
            }

            // Delete repair branch
            await repo.auth.wallet0.run('deleteBranch', {
                repoName: reponame,
                Name: repairBranch,
            })
        } else {
            console.debug('[COMMON INITUPGRADE]', branch.name)
            await pushUpgrade(branch.name, name, version)
        }

        // Continue push
        const comment = [title, message].filter((v) => !!v).join('\n\n')
        await repo.push(branch.name, blobs, comment, isPullRequest, {
            tags,
            branchParent: parent,
            task,
            callback: pushCallback,
        })
        !isPullRequest && (await updateBranch(branch.name))
    }

    const pushUpgrade = async (branch: string, commit: string, version: string) => {
        if (['4.0.0', '5.0.0'].indexOf(repo.getVersion()) >= 0) {
            const { value0 } = await repo.repo.runLocal('getPrevious', {})
            if (
                (version === '2.0.0' && value0.version === '3.0.0') ||
                (version === '2.0.0' && value0.version === '4.0.0') ||
                (version === '3.0.0' && value0.version === '4.0.0')
            ) {
                throw new GoshError(
                    'Push error',
                    'You should upgrade your DAO to version 5.1+ to push to this repository',
                )
            }
        }

        if (repo.getVersion() !== version) {
            const gosh = GoshAdapterFactory.create(version)
            const name = await repo.getName()
            const repoOld = await gosh.getRepository({ path: `${dao.name}/${name}` })

            const upgradeData = await repoOld.getUpgrade(commit)
            upgradeData.commit.branch = branch // Force branch name
            await repo.pushUpgrade(upgradeData, { callback: pushCallback })
        } else {
            pushCallback({ completed: true })
        }
    }

    const pushCallback = (params: TPushProgress) => {
        setProgress((currVal) => {
            const { treesDeploy, snapsDeploy, diffsDeploy, tagsDeploy } = params

            return {
                ...currVal,
                ...params,
                treesDeploy: { ...currVal.treesDeploy, ...treesDeploy },
                snapsDeploy: { ...currVal.snapsDeploy, ...snapsDeploy },
                diffsDeploy: { ...currVal.diffsDeploy, ...diffsDeploy },
                tagsDeploy: { ...currVal.tagsDeploy, ...tagsDeploy },
            }
        })
    }

    return { branch, push, pushUpgrade, progress }
}

function _useMergeRequest(
    dao: string,
    repo: IGoshRepositoryAdapter,
    showDiffNum: number,
) {
    const [srcBranch, setSrcBranch] = useState<TBranch>()
    const [dstBranch, setDstBranch] = useState<TBranch>()
    const [progress, setProgress] = useState<{
        isFetching: boolean
        details: TBranchCompareProgress
        items: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
            showDiff: boolean
        }[]
    }>({ isFetching: false, details: {}, items: [] })

    const _getRepository = async (version: string) => {
        if (repo.getVersion() === version) return repo

        const gosh = GoshAdapterFactory.create(version)
        const name = await repo.getName()
        return await gosh.getRepository({ path: `${dao}/${name}` })
    }

    const getDiff = (i: number) =>
        setProgress((state) => ({
            ...state,
            items: state.items.map((item, index) => {
                if (i === index) return { ...item, showDiff: true }
                return item
            }),
        }))

    const build = async (src: string, dst: string) => {
        setProgress({ isFetching: true, details: {}, items: [] })

        // Get branches details
        const [srcBranch, dstBranch] = await Promise.all([
            (async () => await repo.getBranch(src))(),
            (async () => await repo.getBranch(dst))(),
        ])
        if (srcBranch.commit.name === dstBranch.commit.name) {
            setProgress({ isFetching: false, details: {}, items: [] })
            return
        }

        // Get repostory adapters depending on commit version
        const [srcRepo, dstRepo] = await Promise.all([
            (async () => await _getRepository(srcBranch.commit.version))(),
            (async () => await _getRepository(dstBranch.commit.version))(),
        ])

        // Get tree items for each branch
        const [srcTreeItems, dstTreeItems] = await Promise.all([
            (async () => (await srcRepo.getTree(srcBranch.commit)).items)(),
            (async () => (await dstRepo.getTree(dstBranch.commit)).items)(),
        ])
        setProgress((state) => ({ ...state, details: { ...state.details, trees: true } }))

        // Compare trees and get added/updated treepath
        const treeDiff: {
            src: { treeitem: TTreeItem; path: string }
            dst: { treeitem?: TTreeItem; path: string }
        }[] = []
        srcTreeItems
            .filter((item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0)
            .map((srcItem) => {
                const srcPath = getTreeItemFullPath(srcItem)
                const dstItem = dstTreeItems
                    .filter((item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0)
                    .find((dstItem) => {
                        const dstPath = getTreeItemFullPath(dstItem)
                        return srcPath === dstPath
                    })

                if (dstItem && srcItem.sha1 === dstItem.sha1) {
                    return
                }
                treeDiff.push({
                    src: { treeitem: srcItem, path: srcPath },
                    dst: { treeitem: dstItem, path: !!dstItem ? srcPath : '' },
                })
            })
        setProgress((state) => {
            const { blobs = {} } = state.details
            return {
                ...state,
                details: {
                    ...state.details,
                    blobs: { ...blobs, count: 0, total: treeDiff.length },
                },
            }
        })

        // Read blobs content from built tree diff
        const blobDiff = await executeByChunk(
            treeDiff,
            MAX_PARALLEL_READ,
            async (treepath, index) => {
                const { src, dst } = treepath
                const srcFullPath = `${src.treeitem.commit}/${src.path}`
                const _srcSnapshot = await srcRepo._getSnapshot({
                    fullpath: srcFullPath,
                })
                const srcBlob = await srcRepo.getCommitBlob(
                    _srcSnapshot.address,
                    src.path,
                    srcBranch.commit.name,
                )
                const srcContent = srcBlob.current

                const dstFullPath = `${dst.treeitem?.commit}/${dst.path}`
                let dstContent: string | Buffer = ''
                if (dst.path) {
                    const _dstSnapshot = await dstRepo._getSnapshot({
                        fullpath: dstFullPath,
                    })
                    const dstBlob = await dstRepo.getCommitBlob(
                        _dstSnapshot.address,
                        dst.path,
                        dstBranch.commit.name,
                    )
                    dstContent = dstBlob.current
                }

                setProgress((state) => {
                    const { blobs = {} } = state.details
                    const { count = 0 } = blobs
                    return {
                        ...state,
                        details: {
                            ...state.details,
                            blobs: { ...blobs, count: count + 1 },
                        },
                    }
                })

                return {
                    treepath: [dst.path, src.path],
                    original: dstContent,
                    modified: srcContent,
                    showDiff: index < showDiffNum,
                }
            },
        )

        setSrcBranch(srcBranch)
        setDstBranch(dstBranch)
        setProgress((state) => ({ ...state, isFetching: false, items: blobDiff }))
    }

    return {
        srcBranch,
        dstBranch,
        build,
        progress: {
            isFetching: progress.isFetching,
            isEmpty: !progress.isFetching && !progress.items.length,
            details: progress.details,
            items: progress.items,
            getDiff,
        },
    }
}

function useMergeRequest(
    dao: TDao,
    repo: IGoshRepositoryAdapter,
    options: {
        showDiffNum?: number
        squash?: boolean
    },
) {
    const { showDiffNum = 5, squash = true } = options
    const { updateBranches } = useBranches(repo)
    const { destroy: deleteBranch, progress: branchProgress } = useBranchManagement(
        dao,
        repo,
    )
    const {
        srcBranch,
        dstBranch,
        build,
        progress: buildProgress,
    } = _useMergeRequest(dao.name, repo, showDiffNum)
    const {
        push: _push,
        pushUpgrade: _pushUpgrade,
        progress,
    } = usePush(dao, repo, dstBranch?.name)

    const push = async (
        title: string,
        options: {
            isPullRequest?: boolean
            message?: string
            tags?: string
            deleteSrcBranch?: boolean
            task?: TTaskCommitConfig
        },
    ) => {
        const { deleteSrcBranch, ...rest } = options
        const { name: srcCommit, version: srcVersion } = srcBranch!.commit
        await _pushUpgrade(srcBranch!.name, srcCommit, srcVersion)
        await _push(title, buildProgress.items, {
            ...rest,
            parent: squash ? undefined : srcBranch!.name,
        })
        if (deleteSrcBranch) {
            await deleteBranch(srcBranch!.name)
            await updateBranches()
        }
    }

    return {
        srcBranch,
        dstBranch,
        build,
        buildProgress,
        push,
        pushProgress: progress,
        branchProgress,
    }
}

function usePullRequestCommit(
    dao: string,
    repo: string,
    commit: string,
    showDiffNum: number = 5,
) {
    const { repository, commit: details } = _useCommit(dao, repo, commit)
    const [blobs, setBlobs] = useState<{
        isFetching: boolean
        items: {
            item: {
                address: string
                treepath: string
                index: number
            }
            current: string | Buffer
            previous: string | Buffer
            showDiff: boolean
            isFetching: boolean
        }[]
    }>({ isFetching: true, items: [] })

    const getDiff = async (index: number) => {
        if (!repository) return

        setBlobs((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                return i === index ? { ...item, isFetching: true } : item
            }),
        }))

        const { item } = blobs.items[index]
        const diff = await repository.getPullRequestBlob(item, details.commit!)

        setBlobs((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                return i === index
                    ? { ...item, ...diff, isFetching: false, showDiff: true }
                    : item
            }),
        }))
    }

    useEffect(() => {
        const _getBlobs = async () => {
            if (!repository || !details.commit) return

            setBlobs({ isFetching: true, items: [] })
            const blobs = await repository.getPullRequestBlobs(details.commit)
            const state = await Promise.all(
                blobs.map(async (item, i) => {
                    const diff =
                        i < showDiffNum
                            ? await repository.getPullRequestBlob(item, details.commit!)
                            : { address: item.address, previous: '', current: '' }
                    return {
                        item,
                        ...diff,
                        showDiff: i < showDiffNum,
                        isFetching: false,
                    }
                }),
            )
            setBlobs({ isFetching: false, items: state })
        }

        _getBlobs()
    }, [repository, details.commit])

    return {
        isFetching: details.isFetching,
        commit: details.commit,
        blobs: {
            isFetching: blobs.isFetching,
            items: blobs.items,
            getDiff,
        },
    }
}

export {
    useRepoList,
    useRepo,
    useRepoCreate,
    useRepoUpgrade,
    useBranches,
    useBranchManagement,
    useTree,
    useBlob,
    useCommitList,
    useCommit,
    usePush,
    useMergeRequest,
    usePullRequestCommit,
}
