import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { MAX_PARALLEL_READ, ZERO_COMMIT } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { GoshAdapterFactory } from '../gosh'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from '../gosh/interfaces'
import {
    executeByChunk,
    getAllAccounts,
    getPaginatedAccounts,
    getTreeItemFullPath,
} from '../helpers'
import {
    branchesAtom,
    branchSelector,
    daoAtom,
    repositoryAtom,
    treeAtom,
    treeSelector,
} from '../store'
import { TAddress, TDao, TPaginatedAccountsResult } from '../types'
import {
    TBranch,
    TBranchCompareProgress,
    TBranchOperateProgress,
    TCommit,
    TPushProgress,
    TRepositoryListItem,
    TTaskCommitConfig,
    TTaskListItem,
    TTree,
    TTreeItem,
} from '../types/repo.types'
import { sleep } from '../utils'

function useRepoList(dao: string, params: { perPage?: number; version?: string }) {
    const [search, setSearch] = useState<string>('')
    const [accounts, setAccounts] = useState<{
        isFetching: boolean
        items: { address: TAddress; version: string }[]
    }>({ isFetching: false, items: [] })
    const [repos, setRepos] = useState<{
        isFetching: boolean
        items: TRepositoryListItem[]
        lastAccountIndex: number
        hasNext?: boolean
    }>({ isFetching: false, items: [], lastAccountIndex: 0 })

    const { perPage = 5, version } = params
    const versions = Object.keys(AppConfig.versions).reverse()

    const getRepositoryAccounts = useCallback(async () => {
        setAccounts((state) => ({ ...state, isFetching: true }))

        const items: { address: TAddress; version: string }[] = []
        for (const ver of versions) {
            if (version && ver !== version) {
                continue
            }

            const gosh = GoshAdapterFactory.create(ver)
            const daoAdapter = await gosh.getDao({ name: dao, useAuth: false })
            if (!(await daoAdapter.isDeployed())) {
                continue
            }

            const codeHash = await gosh.getRepositoryCodeHash(daoAdapter.getAddress())
            const result = await getAllAccounts({
                filters: [`code_hash: {eq:"${codeHash}"}`],
            })
            items.push(...result.map(({ id }) => ({ address: id, version: ver })))
        }

        setAccounts((state) => ({ ...state, isFetching: false, items }))
    }, [dao])

    const getRepositoryList = useCallback(
        async (lastAccountIndex: number, names: string[]) => {
            if (accounts.isFetching) {
                return
            }

            setRepos((state) => ({ ...state, isFetching: true }))

            const items: TRepositoryListItem[] = []
            for (let i = lastAccountIndex; i < accounts.items.length; i++) {
                lastAccountIndex = i
                const account = accounts.items[i]
                const gosh = GoshAdapterFactory.create(account.version)
                const repository = await gosh.getRepository({ address: account.address })
                if (!(await repository.isDeployed())) {
                    continue
                }

                const name = await repository.getName()
                if (names.findIndex((n) => n === name) >= 0) {
                    continue
                }

                items.push({
                    adapter: repository,
                    address: account.address,
                    name,
                    version: account.version,
                })

                if (items.length === perPage) {
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
        getRepositoryAccounts()
    }, [getRepositoryAccounts])

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

    useEffect(() => {
        const _getIncomingCommits = async () => {
            if (!repository.adapter) return

            const incoming = await repository.adapter.getIncomingCommits()
            setRepository((state) => {
                const { details } = state
                if (!details) return state
                return {
                    ...state,
                    details: { ...details, commitsIn: incoming },
                }
            })
        }

        _getIncomingCommits()
        repository.adapter?.subscribeIncomingCommits((incoming) => {
            setRepository((state) => {
                const { details } = state
                if (!details) return state
                return {
                    ...state,
                    details: { ...details, commitsIn: incoming },
                }
            })
        })

        return () => {
            repository.adapter?.unsubscribe()
        }
    }, [repository.adapter])

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
        if (!repo) return

        const branches = await repo.getBranches()
        if (branches) setBranches(branches)
    }, [repo, setBranches])

    const updateBranch = useCallback(
        async (name: string) => {
            if (!repo) return

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
    const { pushUpgrade } = usePush(dao, repo)
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
            await repo.lockBranch({ name: name.toLowerCase() })
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const unlock = async (name: string) => {
        try {
            setProgress({ name, type: '(un)lock', isFetching: true, details: {} })
            await repo.unlockBranch({ name: name.toLowerCase() })
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

    return { create, destroy, lock, unlock, sethead, progress }
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
            const { content } = await adapter.getBlob({
                commit: branchData.commit.name,
                fullpath: `${branchData.name}/${path}`,
            })
            setBlob((state) => ({
                ...state,
                path,
                content,
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
            if (!prev) break

            const commit = await _getCommit(prev)
            const { name, initupgrade, parents, versionPrev } = commit
            if (name !== ZERO_COMMIT && !initupgrade) list.push(commit)
            if (!parents.length) {
                prev = undefined
                break
            }

            const parent = await _getCommit({ address: parents[0], version: versionPrev })
            prev =
                parent.name !== ZERO_COMMIT
                    ? { address: parent.address, version: parent.version }
                    : undefined
            count++
            await sleep(300)
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
            if (!isBranchUpdated) return
            if (branchData) {
                const { address, versionPrev } = branchData.commit
                _getCommitsPage({ address, version: versionPrev })
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

        const { commit, treepath } = blobs.items[index]
        const diff = await repository.getCommitBlob(treepath, branch, commit)

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
                blobs.sort().map(async (treepath, i) => {
                    const diff =
                        i < showDiffNum
                            ? await repository.getCommitBlob(
                                  treepath,
                                  branch,
                                  details.commit!,
                              )
                            : { previous: '', current: '' }
                    return {
                        treepath,
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
        if (!branch) {
            throw new GoshError(EGoshError.NO_BRANCH)
        }
        if (!dao.isAuthMember) {
            throw new GoshError(EGoshError.NOT_MEMBER)
        }

        const { message, tags, parent, task, isPullRequest = false } = options
        const { name, version } = branch.commit
        await pushUpgrade(branch.name, name, version)

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
        if (repo.getVersion() !== version) {
            const gosh = GoshAdapterFactory.create(version)
            const name = await repo.getName()
            const repoOld = await gosh.getRepository({ path: `${dao.name}/${name}` })

            const upgradeData = await repoOld.getUpgrade(commit)
            upgradeData.commit.branch = branch // Force branch name
            await repo.pushUpgrade(upgradeData)
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
        const treeDiff: string[][] = []
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

                if (dstItem && srcItem.sha1 === dstItem.sha1) return
                treeDiff.push([srcPath, !!dstItem ? srcPath : ''])
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
                const [aPath, bPath] = treepath
                const srcFullPath = `${srcBranch.name}/${aPath}`
                const srcBlob = await srcRepo.getBlob({
                    commit: srcBranch.commit.name,
                    fullpath: srcFullPath,
                })

                const dstFullPath = `${dstBranch.name}/${bPath}`
                const dstBlob = bPath
                    ? (
                          await dstRepo.getBlob({
                              commit: dstBranch.commit.name,
                              fullpath: dstFullPath,
                          })
                      ).content
                    : ''

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
                    treepath: [bPath, aPath],
                    original: dstBlob,
                    modified: srcBlob.content,
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
    },
) {
    const { showDiffNum = 5 } = options
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
        await _push(title, buildProgress.items, { ...rest, parent: srcBranch!.name })
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
                            : { previous: '', current: '' }
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

function useTaskList(
    dao: IGoshDaoAdapter,
    repository: IGoshRepositoryAdapter,
    params: { perPage?: number },
) {
    const [taskCodeHash, setTaskCodehash] = useState<string>()
    const [tasks, setTasks] = useState<{
        isFetching: boolean
        items: TTaskListItem[]
        lastTransLt?: string
        hasNext?: boolean
    }>({ items: [], isFetching: false })

    const { perPage = 5 } = params

    const getTaskList = useCallback(
        async (from?: string) => {
            if (!taskCodeHash) {
                return
            }

            setTasks((state) => ({ ...state, isFetching: true }))

            let accounts: TPaginatedAccountsResult
            if (perPage === 0) {
                const results = await getAllAccounts({
                    filters: [`code_hash: {eq:"${taskCodeHash}"}`],
                })
                accounts = { results, lastTransLt: undefined, completed: true }
            } else {
                accounts = await getPaginatedAccounts({
                    filters: [`code_hash: {eq:"${taskCodeHash}"}`],
                    limit: perPage,
                    lastTransLt: from,
                })
            }

            const items: TTaskListItem[] = await executeByChunk(
                accounts.results.map(({ id }) => id),
                MAX_PARALLEL_READ,
                async (address) => {
                    const data = await repository.getTask({ address })
                    return { adapter: repository, ...data }
                },
            )

            setTasks((state) => ({
                ...state,
                isFetching: false,
                items: [...state.items, ...items],
                lastTransLt: accounts.lastTransLt,
                hasNext: !accounts.completed,
            }))
        },
        [taskCodeHash, perPage],
    )

    const getMore = async () => {
        await getTaskList(tasks.lastTransLt)
    }

    const getItemDetails = async (item: TTaskListItem) => {
        if (item.isLoadDetailsFired) {
            return
        }

        setTasks((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        try {
            const details = await item.adapter.getTask({ address: item.address })
            setTasks((state) => ({
                ...state,
                items: state.items.map((curr) => {
                    if (curr.address === item.address) {
                        return { ...curr, ...details }
                    }
                    return curr
                }),
            }))
        } catch {
            setTasks((state) => ({
                ...state,
                items: state.items.filter((curr) => curr.address !== item.address),
            }))
        }
    }

    /** Get task code hash */
    useEffect(() => {
        const _getTaskCodeHash = async () => {
            const repoName = await repository.getName()
            const hash = await dao.getTaskCodeHash(repoName)
            setTaskCodehash(hash)
        }
        _getTaskCodeHash()
    }, [dao, repository])

    /** Initial loading */
    useEffect(() => {
        getTaskList()
    }, [getTaskList])

    /** Refresh task last (reset `isLoadDetailsFired` flag) */
    useEffect(() => {
        const interval = setInterval(() => {
            if (tasks.isFetching) {
                return
            }

            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isLoadDetailsFired: false,
                })),
            }))
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [tasks.isFetching])

    return {
        isFetching: tasks.isFetching,
        isEmpty: !tasks.isFetching && !tasks.items.length,
        items: tasks.items,
        hasNext: tasks.hasNext,
        getMore,
        getItemDetails,
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
    useTaskList,
}
