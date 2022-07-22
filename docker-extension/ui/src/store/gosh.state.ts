import { atom, selectorFamily } from "recoil";
import { TGoshBranch } from "./../types/types";
import { Container, Image } from "./../interfaces";

export const goshImages = atom<Image[]>({
    key: 'GoshImages',
    default: []
});

export const goshContainers = atom<Container[]>({
    key: 'GoshContainers',
    default: []
});

export const goshBranchesAtom = atom<TGoshBranch[]>({
    key: 'GoshBranchesAtom',
    default: []
});

export const goshCurrBranchSelector = selectorFamily({
    key: 'GoshCurrBranchSelector',
    get: (branchName: string) => ({ get }) => {
        const branches = get(goshBranchesAtom);
        return branches.find((branch) => branch.name === branchName);
    }
});