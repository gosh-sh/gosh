import { atom } from "recoil";
import { recoilPersist } from "recoil-persist";
import { TUserState } from "./../types/types";


const { persistAtom } = recoilPersist({ key: 'recoil' });

export const userStateAtom = atom<TUserState>({
    key: 'UserStateAtom',
    default: {
        phrase: undefined
    },
    effects_UNSTABLE: [persistAtom]
});