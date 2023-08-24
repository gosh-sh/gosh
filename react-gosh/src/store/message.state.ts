import { atom } from 'recoil'

const messageAtom = atom<{ key: string; message: any }[]>({
    key: 'MessageAtom1',
    default: [],
})

export { messageAtom }
