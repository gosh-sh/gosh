import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { MAX_PARALLEL_READ, ZERO_COMMIT } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { GoshAdapterFactory } from '../gosh'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from '../gosh/interfaces'
import { executeByChunk, getAllAccounts, getTreeItemFullPath } from '../helpers'
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
    TTree,
    TTreeItem,
} from '../types/repo.types'
import { sleep } from '../utils'

function useRepoList(dao: string, perPage: number) {
    const [search, setSearch] = useState<string>('')
    const [repos, setRepos] = useState<{
        items: TRepositoryListItem[]
        filtered: { search: string; items: string[] }
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: { search: '', items: [] },
        page: 1,
        isFetching: true,
    })

    /** Get next chunk of DAO list items */
    const getMore = () => {
        setRepos((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TRepositoryListItem) => {
        if (item.isLoadDetailsFired) return

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
                if (curr.address === item.address) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial repos list */
    useEffect(() => {
        const _getRepoList = async () => {
            // Get repos details (prepare repo list items)
            const names: string[] = []
            const items: TRepositoryListItem[] = []
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                const daoAdapter = await gosh.getDao({ name: dao, useAuth: false })
                if (!(await daoAdapter.isDeployed())) continue

                const codeHash = await gosh.getRepositoryCodeHash(daoAdapter.getAddress())
                const accounts = await getAllAccounts({
                    filters: [`code_hash: {eq:"${codeHash}"}`],
                })
                const veritems = await executeByChunk(
                    accounts.map(({ id }) => id),
                    MAX_PARALLEL_READ,
                    async (address) => {
                        const adapter = await daoAdapter.getRepository({ address })
                        const name = await adapter.getName()
                        if (names.indexOf(name) >= 0) return null

                        names.push(name)
                        return { adapter, address, name, version }
                    },
                )
                items.push(...(veritems.filter((v) => !!v) as TRepositoryListItem[]))
            }

            setRepos((state) => {
                const merged = [...state.items, ...items]
                return {
                    items: merged.sort((a, b) => (a.name > b.name ? 1 : -1)),
                    filtered: { search: '', items: merged.map((item) => item.address) },
                    page: 1,
                    isFetching: false,
                }
            })
        }

        _getRepoList()
    }, [dao])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setRepos((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: {
                    search,
                    items: state.items
                        .filter((item) => _searchItem(search, item.name))
                        .map((item) => item.address),
                },
            }
        })
    }, [search])

    const _searchItem = (what: string, where: string): boolean => {
        const pattern = new RegExp(`^${what}`, 'i')
        return !what || where.search(pattern) >= 0
    }

    return {
        isFetching: repos.isFetching,
        isEmpty: !repos.isFetching && !repos.filtered.items.length,
        items: repos.items
            .filter((item) => repos.filtered.items.indexOf(item.address) >= 0)
            .slice(0, repos.page * perPage),
        hasNext: repos.page * perPage < repos.filtered.items.length,
        search,
        setSearch,
        getMore,
        getItemDetails: setItemDetails,
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
    const create = async (name: string) => {
        await dao.deployRepository(name)
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
        await adapter.deployRepository(await repo.getName(), {
            addr: repo.getAddress(),
            version: repo.getVersion(),
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
    const { pushUpgrade } = _usePush(dao, repo)
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
            await repo.lockBranch(name.toLowerCase())
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, isFetching: false, details: {} }))
        }
    }

    const unlock = async (name: string) => {
        try {
            setProgress({ name, type: '(un)lock', isFetching: true, details: {} })
            await repo.unlockBranch(name.toLowerCase())
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

function _usePush(dao: TDao, repo: IGoshRepositoryAdapter, branch?: string) {
    const { branch: branchData, updateBranch } = useBranches(repo, branch)
    const [progress, setProgress] = useState<TPushProgress>({})

    const push = async (
        title: string,
        blobs: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
        }[],
        isPullRequest: boolean,
        message?: string,
        tags?: string,
        parent?: string,
        task?: TAddress,
    ) => {
        if (!branchData) throw new GoshError(EGoshError.NO_BRANCH)
        if (!dao.isAuthMember) throw new GoshError(EGoshError.NOT_MEMBER)

        const { name, version } = branchData.commit
        await pushUpgrade(branchData.name, name, version)

        message = [title, message].filter((v) => !!v).join('\n\n')
        await repo.push(branchData.name, blobs, message, isPullRequest, {
            tags,
            branchParent: parent,
            task,
            callback: pushCallback,
        })
        !isPullRequest && (await updateBranch(branchData.name))
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

    return { branch: branchData, push, pushUpgrade, progress }
}

function usePush(dao: TDao, repo: IGoshRepositoryAdapter, branch: string) {
    const { push: _push, progress } = _usePush(dao, repo, branch)

    const push = async (
        title: string,
        blobs: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
        }[],
        message?: string,
        tags?: string,
        task?: TAddress,
    ) => {
        await _push(title, blobs, false, message, tags, undefined, task)
    }

    return { push, progress }
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
    showDiffNum: number = 5,
) {
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
    const { push: _push, progress: pushProgress } = _usePush(dao, repo, dstBranch?.name)

    const push = async (
        title: string,
        message?: string,
        tags?: string,
        deleteSrcBranch?: boolean,
    ) => {
        await _push(title, buildProgress.items, false, message, tags, srcBranch!.name)
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
        pushProgress,
        branchProgress,
    }
}

function usePullRequest(
    dao: TDao,
    repo: IGoshRepositoryAdapter,
    showDiffNum: number = 5,
) {
    const { updateBranches } = useBranches(repo)
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
    } = _usePush(dao, repo, dstBranch?.name)

    const push = async (
        title: string,
        message?: string,
        tags?: string,
        deleteSrcBranch?: boolean,
    ) => {
        const { name: srcCommit, version: srcVersion } = srcBranch!.commit
        await _pushUpgrade(srcBranch!.name, srcCommit, srcVersion)

        await _push(title, buildProgress.items, true, message, tags, srcBranch!.name)
        if (deleteSrcBranch) {
            await repo.deleteBranch(srcBranch!.name)
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
    usePullRequest,
    usePullRequestCommit,
}
