import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AppConfig } from '../appconfig'
import { ZERO_COMMIT } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { GoshAdapterFactory } from '../gosh'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from '../gosh/interfaces'
import { getAllAccounts, getTreeItemFullPath, retry } from '../helpers'
import { branchesAtom, branchSelector, daoAtom, treeAtom, treeSelector } from '../store'
import { TAddress, TDao, TSmvBalanceDetails } from '../types'
import {
    TBranch,
    TCommit,
    TPushCallbackParams,
    TRepositoryListItem,
} from '../types/repo.types'

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
                const addresses = accounts.map(({ id }) => id)
                const veritems = await Promise.all(
                    addresses.map(async (address) => {
                        const adapter = await daoAdapter.getRepository({ address })
                        const name = await adapter.getName()
                        if (names.indexOf(name) < 0) {
                            names.push(name)
                            return {
                                adapter,
                                address,
                                name,
                                version,
                            }
                        }
                    }),
                )

                const unique = veritems.filter(
                    (veritem) => !!veritem,
                ) as TRepositoryListItem[]
                items.push(...unique)
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
    const [repoAdapter, setRepoAdapter] = useState<IGoshRepositoryAdapter>()
    const [isFetching, setIsFetching] = useState<boolean>(true)

    useEffect(() => {
        const _getRepo = async () => {
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                const daoInstance = await gosh.getDao({ name: dao })
                if (!(await daoInstance.isDeployed())) continue

                const repoInstance = await daoInstance.getRepository({ name: repo })
                if (await repoInstance.isDeployed()) {
                    const details = await daoInstance.getDetails()
                    setDaoAdapter(daoInstance)
                    setDaoDetails(details)
                    setRepoAdapter(repoInstance)
                    setIsFetching(false)
                    break
                }
            }
        }

        _getRepo()
    }, [dao, repo])

    return {
        isFetching,
        dao: {
            adapter: daoAdapter,
            details: daoDetails,
        },
        adapter: repoAdapter,
    }
}

function useRepoCreate(dao: IGoshDaoAdapter) {
    const create = async (name: string) => {
        await retry(() => dao.deployRepository(name), 3)
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
        const daoAdapter = await gosh.getDao({ name: dao })
        await retry(async () => {
            await daoAdapter.deployRepository(await repo.getName(), {
                addr: repo.getAddress(),
                version: repo.getVersion(),
            })
        }, 3)
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

function useTree(dao: string, repo: string, commit?: TCommit, filterPath?: string) {
    const [tree, setTree] = useRecoilState(treeAtom)

    const getSubtree = (path?: string) => treeSelector({ type: 'tree', path })
    const getTreeItems = (path?: string) => treeSelector({ type: 'items', path })

    useEffect(() => {
        const _getTree = async () => {
            let newtree = { tree: { '': [] }, items: [] }

            if (!commit || commit.name === ZERO_COMMIT) {
                setTree(newtree)
                return
            }

            setTree(undefined)
            const gosh = GoshAdapterFactory.create(commit.version)
            const adapter = await gosh.getRepository({ path: `${dao}/${repo}` })
            newtree = await retry(async () => {
                return await adapter.getTree(commit.name, filterPath)
            }, 2)
            setTree(newtree)
        }

        _getTree()
    }, [dao, repo, commit?.name, commit?.version, filterPath, setTree])

    return { tree, getSubtree, getTreeItems }
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
    perPage: number = 20,
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
            if (commit.name !== ZERO_COMMIT) list.push(commit)

            const parent = await _getCommit({
                address: commit.parents[0],
                version: commit.versionPrev,
            })
            prev =
                parent.name !== ZERO_COMMIT
                    ? { address: parent.address, version: parent.version }
                    : undefined
            count++
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

function useCommit(dao: string, repo: string, commit: string, showDiffNum: number = 5) {
    const [adapter, setAdapter] = useState<IGoshRepositoryAdapter>()
    const [details, setDetails] = useState<{ isFetching: boolean; commit?: TCommit }>({
        isFetching: true,
    })
    const [blobs, setBlobs] = useState<{
        isFetching: boolean
        items: {
            treepath: string
            commit: string
            current: string | Buffer
            previous: string | Buffer
            showDiff: boolean
            isFetching: boolean
        }[]
    }>({ isFetching: true, items: [] })

    const onLoadDiff = async (index: number) => {
        if (!adapter) return

        setBlobs((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                return i === index ? { ...item, isFetching: true } : item
            }),
        }))

        const { commit, treepath } = blobs.items[index]
        const diff = await adapter.getCommitBlob(treepath, commit)

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
        const _getCommit = async () => {
            setDetails((state) => ({ ...state, isFetching: true }))
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                const repository = await gosh.getRepository({ path: `${dao}/${repo}` })
                try {
                    const data = await repository.getCommit({ name: commit })
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

    useEffect(() => {
        const _getBlobs = async () => {
            if (!adapter) return

            setBlobs({ isFetching: true, items: [] })
            const blobs = await adapter.getCommitBlobs(commit)
            const state = await Promise.all(
                blobs.sort().map(async (treepath, i) => {
                    const diff =
                        i < showDiffNum
                            ? await adapter.getCommitBlob(treepath, commit)
                            : { previous: '', current: '' }
                    return {
                        treepath,
                        commit,
                        ...diff,
                        showDiff: i < showDiffNum,
                        isFetching: false,
                    }
                }),
            )
            setBlobs({ isFetching: false, items: state })
        }

        _getBlobs()
    }, [adapter])

    return {
        isFetching: details.isFetching,
        commit: details.commit,
        blobs: {
            isFetching: blobs.isFetching,
            items: blobs.items,
            onLoadDiff,
        },
    }
}

function _usePush(dao: TDao, repo: IGoshRepositoryAdapter, branch?: string) {
    const { branch: branchData, updateBranch } = useBranches(repo, branch)
    const [progress, setProgress] = useState<TPushCallbackParams>({})

    const push = async (
        title: string,
        blobs: {
            treepath: string
            original: string | Buffer
            modified: string | Buffer
        }[],
        isPullRequest: boolean,
        message?: string,
        tags?: string,
        parent?: string,
    ) => {
        if (!branchData) throw new GoshError(EGoshError.NO_BRANCH)
        if (!dao.isAuthMember) throw new GoshError(EGoshError.NOT_MEMBER)

        if (repo.getVersion() !== branchData.commit.version) {
            const gosh = GoshAdapterFactory.create(branchData.commit.version)
            const name = await repo.getName()
            const repoOld = await gosh.getRepository({
                path: `${dao.name}/${name}`,
            })
            const upgradeData = await repoOld.getUpgrade(branchData.commit.name)
            await repo.pushUpgrade(upgradeData)
        }

        message = [title, message].filter((v) => !!v).join('\n\n')
        await repo.push(
            branchData.name,
            blobs,
            message,
            isPullRequest,
            tags,
            parent,
            pushCallback,
        )
        !isPullRequest && (await updateBranch(branchData.name))
    }

    const pushCallback = (params: TPushCallbackParams) => {
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

    return { branch: branchData, push, progress }
}

function usePush(dao: TDao, repo: IGoshRepositoryAdapter, branch: string) {
    const { branch: branchData, push: _push, progress } = _usePush(dao, repo, branch)

    const push = async (
        title: string,
        blobs: {
            treepath: string
            original: string | Buffer
            modified: string | Buffer
        }[],
        message?: string,
        tags?: string,
    ) => {
        if (branchData!.isProtected) throw new GoshError(EGoshError.PR_BRANCH)
        await _push(title, blobs, false, message, tags)
    }

    return { push, progress }
}

function _useMergeRequest(repo: IGoshRepositoryAdapter, showDiffNum: number) {
    const [srcBranch, setSrcBranch] = useState<TBranch>()
    const [dstBranch, setDstBranch] = useState<TBranch>()
    const [progress, setProgress] = useState<{
        isFetching: boolean
        items: {
            treepath: string
            original: string | Buffer
            modified: string | Buffer
            showDiff: boolean
        }[]
    }>({ isFetching: false, items: [] })

    const getDiff = (i: number) =>
        setProgress((state) => ({
            ...state,
            items: state.items.map((item, index) => {
                if (i === index) return { ...item, showDiff: true }
                return item
            }),
        }))

    const build = async (src: string, dst: string) => {
        setProgress({ isFetching: true, items: [] })

        // Get branches details
        const [srcBranch, dstBranch] = await Promise.all([
            (async () => await repo.getBranch(src))(),
            (async () => await repo.getBranch(dst))(),
        ])
        if (srcBranch.commit.name === dstBranch.commit.name) {
            setProgress({ isFetching: false, items: [] })
            return
        }

        // Get tree items for each branch
        const [srcTreeItems, dstTreeItems] = await Promise.all([
            (async () => (await repo.getTree(srcBranch.commit.name)).items)(),
            (async () => (await repo.getTree(dstBranch.commit.name)).items)(),
        ])

        // Compare trees and get added/updated treepath
        const treeDiff: { treepath: string; exists: boolean }[] = []
        srcTreeItems
            .filter((item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0)
            .map(async (srcItem) => {
                const treepath = getTreeItemFullPath(srcItem)
                const dstItem = dstTreeItems
                    .filter((item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0)
                    .find((dstItem) => {
                        const srcPath = getTreeItemFullPath(srcItem)
                        const dstPath = getTreeItemFullPath(dstItem)
                        return srcPath === dstPath
                    })

                if (dstItem && srcItem.sha1 === dstItem.sha1) return
                treeDiff.push({ treepath, exists: !!dstItem })
            })

        // Read blobs content from built tree diff
        const blobDiff = await Promise.all(
            treeDiff.map(async ({ treepath, exists }, index) => {
                const srcBlob = await repo.getBlob({
                    fullpath: `${srcBranch.name}/${treepath}`,
                })
                const dstBlob =
                    exists &&
                    (await repo.getBlob({
                        fullpath: `${dstBranch.name}/${treepath}`,
                    }))

                return {
                    treepath,
                    original: dstBlob ? dstBlob.content : '',
                    modified: srcBlob.content,
                    showDiff: index < showDiffNum,
                }
            }),
        )

        setSrcBranch(srcBranch)
        setDstBranch(dstBranch)
        setProgress({ isFetching: false, items: blobDiff })
    }

    return {
        srcBranch,
        dstBranch,
        build,
        progress: {
            isFetching: progress.isFetching,
            isEmpty: !progress.isFetching && !progress.items.length,
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
    const {
        srcBranch,
        dstBranch,
        build,
        progress: buildProgress,
    } = _useMergeRequest(repo, showDiffNum)
    const { push: _push, progress: pushProgress } = _usePush(dao, repo, dstBranch?.name)

    const push = async (
        title: string,
        message?: string,
        tags?: string,
        deleteSrcBranch?: boolean,
    ) => {
        if (dstBranch!.isProtected) throw new GoshError(EGoshError.PR_BRANCH)

        await _push(title, buildProgress.items, false, message, tags, srcBranch!.name)
        if (deleteSrcBranch) {
            await retry(() => repo.deleteBranch(srcBranch!.name), 3)
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
    } = _useMergeRequest(repo, showDiffNum)
    const { push: _push, progress } = _usePush(dao, repo, dstBranch?.name)

    const push = async (
        title: string,
        smv: TSmvBalanceDetails,
        message?: string,
        tags?: string,
        deleteSrcBranch?: boolean,
    ) => {
        if (smv.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        if (smv.smvBalance < 20) {
            throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })
        }

        await _push(title, buildProgress.items, true, message, tags, srcBranch!.name)
        if (deleteSrcBranch) {
            await retry(() => repo.deleteBranch(srcBranch!.name), 3)
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

export {
    useRepoList,
    useRepo,
    useRepoCreate,
    useRepoUpgrade,
    useBranches,
    useTree,
    useBlob,
    useCommitList,
    useCommit,
    usePush,
    useMergeRequest,
    usePullRequest,
}
