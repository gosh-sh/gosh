import { atom, selectorFamily } from 'recoil'
import { IGoshRepositoryAdapter } from '../gosh/interfaces'
import { getTreeItemFullPath } from '../helpers'
import { TBranch, TRepository, TTree, TTreeItem } from '../types/repo.types'

const repositoryAtom = atom<{
    isFetching: boolean
    adapter?: IGoshRepositoryAdapter
    details?: TRepository
}>({
    key: 'GoshRepositoryAtom1',
    default: {
        isFetching: false,
    },
    dangerouslyAllowMutability: true,
})

const branchesAtom = atom<TBranch[]>({
    key: 'GoshBranchesAtom1',
    default: [],
})

const branchSelector = selectorFamily({
    key: 'GoshCurrBranchSelector1',
    get:
        (name: string) =>
        ({ get }) => {
            const branches = get(branchesAtom)
            return branches.find((branch) => branch.name === name)
        },
})

const treeAtom = atom<{ tree: TTree; items: TTreeItem[] } | undefined>({
    key: 'GoshRepoTreeAtom1',
    default: undefined,
})

const treeSelector = selectorFamily({
    key: 'GoshRepoTreeSelector1',
    get:
        (params: { type: 'tree' | 'blobs'; path?: string }) =>
        ({ get }) => {
            const treeObject = get(treeAtom)
            if (!treeObject) return undefined

            const { tree, items } = treeObject
            const path = params.path || ''
            if (params.type === 'tree') {
                const list = tree[path] || []
                return (
                    [...list]
                        //@ts-ignore
                        .sort((a: any, b: any) => (a.name > b.name) - (a.name < b.name))
                        .sort((a, b) => (a.type > b.type ? -1 : 1))
                )
            } else if (params.type === 'blobs') {
                const filtered = [...items]
                return filtered
                    .filter((item) => item.type === 'blob')
                    .filter((item) => getTreeItemFullPath(item).search(path) >= 0)
                    .sort((a, b) => {
                        const aPath = getTreeItemFullPath(a)
                        const bPath = getTreeItemFullPath(b)
                        return aPath < bPath ? -1 : 1
                    })
            } else return undefined
        },
})

export { branchSelector, branchesAtom, repositoryAtom, treeAtom, treeSelector }
