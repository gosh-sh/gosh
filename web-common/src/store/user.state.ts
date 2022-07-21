import { atom } from 'recoil';
import { recoilPersist } from 'recoil-persist';
import { TUserState, TUserStatePersist } from '../types/types';

const { persistAtom } = recoilPersist({ key: 'recoil' });

export const userStatePersistAtom = atom<TUserStatePersist>({
    key: 'UserStatePersistAtom',
    default: {
        phrase: undefined,
        nonce: undefined,
        pin: undefined,
    },
    effects_UNSTABLE: [persistAtom],
});

export const userStateAtom = atom<TUserState>({
    key: 'UserStateAtom',
    default: {
        phrase: undefined,
        nonce: undefined,
        pin: undefined,
        keys: undefined,
    },
});
