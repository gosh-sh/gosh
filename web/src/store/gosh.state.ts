import { atom, selectorFamily } from 'recoil';
import {
    TGoshBranch,
    TGoshDaoDetails,
    TGoshTree,
    TGoshTreeItem,
    TGoshWalletDetails,
} from '../types/types';

export const goshDaoAtom = atom<TGoshDaoDetails | undefined>({
    key: 'GoshDaoAtom',
    default: undefined,
});

export const goshWalletAtom = atom<TGoshWalletDetails | undefined>({
    key: 'GoshWalletAtom',
    default: undefined,
});

export const goshBranchesAtom = atom<TGoshBranch[]>({
    key: 'GoshBranchesAtom',
    default: [],
});

export const goshCurrBranchSelector = selectorFamily({
    key: 'GoshCurrBranchSelector',
    get:
        (branchName: string) =>
        ({ get }) => {
            const branches = get(goshBranchesAtom);
            return branches.find((branch) => branch.name === branchName);
        },
});

export const goshRepoTreeAtom = atom<
    { tree: TGoshTree; items: TGoshTreeItem[] } | undefined
>({
    key: 'GoshRepoTreeAtom',
    default: undefined,
});

export const goshRepoTreeSelector = selectorFamily({
    key: 'GoshRepoTreeSelector',
    get:
        (params: { type: 'tree' | 'items'; path?: string }) =>
        ({ get }) => {
            const treeObject = get(goshRepoTreeAtom);
            if (!treeObject) return undefined;

            const { tree, items } = treeObject;
            const path = params.path || '';
            if (params.type === 'tree') {
                return [...tree[path]].sort((a, b) => (a.type > b.type ? -1 : 1));
            } else if (params.type === 'items') {
                const filtered = [...items];
                return filtered
                    .filter((item) => item.type === 'blob')
                    .filter((item) => `${item.path}/${item.name}`.search(path) >= 0)
                    .sort((a, b) =>
                        `${a.path}/${a.name}` < `${b.path}/${b.name}` ? -1 : 1
                    );
            } else return undefined;
        },
});

export const goshRepoBlobSelector = selectorFamily({
    key: 'GoshRepoBlobSelector',
    get:
        (path: string | undefined) =>
        ({ get }) => {
            const treeObject = get(goshRepoTreeAtom);
            if (!treeObject || !path) return undefined;

            const { items } = treeObject;
            const filtered = [...items].filter(
                (item) => `${item.path}/${item.name}`.search(path) >= 0
            );
            return filtered[0];
        },
});
