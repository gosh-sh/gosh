import { atom, selectorFamily } from 'recoil'
import { getTreeItemFullPath } from '../helpers'
import { TBranch, TTree, TTreeItem } from '../types/repo.types'

const branchesAtom = atom<TBranch[]>({
    key: 'GoshBranchesAtom',
    default: [],
})

const branchSelector = selectorFamily({
    key: 'GoshCurrBranchSelector',
    get:
        (name: string) =>
        ({ get }) => {
            const branches = get(branchesAtom)
            return branches.find((branch) => branch.name === name)
        },
})

const treeAtom = atom<{ tree: TTree; items: TTreeItem[] } | undefined>({
    key: 'GoshRepoTreeAtom',
    default: undefined,
})

const treeSelector = selectorFamily({
    key: 'GoshRepoTreeSelector',
    get:
        (params: { type: 'tree' | 'blobs'; path?: string }) =>
        ({ get }) => {
            const treeObject = get(treeAtom)
            if (!treeObject) return undefined

            const { tree, items } = treeObject
            const path = params.path || ''
            if (params.type === 'tree') {
                return (
                    [...tree[path]]
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

export { branchesAtom, branchSelector, treeAtom, treeSelector }
