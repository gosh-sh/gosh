import { atom } from 'recoil'

const messageAtom = atom<{ key: string; message: any }[]>({
    key: 'MessageAtom',
    default: [],
})

export { messageAtom }
