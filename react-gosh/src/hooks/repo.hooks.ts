import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AppConfig } from '../appconfig'
import { ZERO_COMMIT } from '../constants'
import { GoshError } from '../errors'
import { GoshAdapterFactory } from '../gosh'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from '../gosh/interfaces'
import { getAllAccounts, retry } from '../helpers'
import { branchesAtom, branchSelector, daoAtom, treeAtom, treeSelector } from '../store'
import { TBranch, TCommit, TRepositoryListItem } from '../types/repo.types'

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

    /** Load next chunk of DAO list items */
    const onLoadNext = () => {
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
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
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

function useRepoUpgrade(dao: IGoshDaoAdapter, repo: IGoshRepositoryAdapter) {
    const [versions, setVersions] = useState<string[]>()

    const all = Object.keys(AppConfig.versions)

    useEffect(() => {
        const _getAvailableVersions = () => {
            const daoIndex = all.findIndex((v) => v === dao.getVersion())
            const repoIndex = all.findIndex((v) => v === repo.getVersion())
            setVersions(all.slice(repoIndex + 1, daoIndex))
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

function useRepoBranches(repo?: IGoshRepositoryAdapter, current: string = 'main') {
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

function useRepoTree(dao: string, repo: string, commit?: TCommit, filterPath?: string) {
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

function useBlob(dao: string, repo: string, branch?: TBranch, path?: string) {
    const [blob, setBlob] = useState<{
        path?: string
        content?: string | Buffer
        isFetching: boolean
    }>({ isFetching: true })

    useEffect(() => {
        const _getBlob = async () => {
            setBlob({ isFetching: true })

            if (!branch || !path) {
                setBlob({ isFetching: false })
                return
            }
            if (branch.commit.name === ZERO_COMMIT) {
                setBlob({ isFetching: false })
                return
            }

            const gosh = GoshAdapterFactory.create(branch.commit.version)
            const adapter = await gosh.getRepository({ path: `${dao}/${repo}` })
            const blob = await adapter.getBlob({ fullpath: `${branch.name}/${path}` })
            setBlob((state) => ({
                ...state,
                path,
                content: blob,
                isFetching: false,
            }))
        }

        _getBlob()
    }, [repo, branch?.name, branch?.commit.name, branch?.commit.version, path])

    return blob
}

export { useRepoList, useRepo, useRepoUpgrade, useRepoBranches, useRepoTree, useBlob }
