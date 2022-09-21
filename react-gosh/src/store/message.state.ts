import { atom } from 'recoil'

const messageAtom = atom<{ key: string; message: any }>({
    key: 'MessageAtom',
    default: undefined,
})

export { messageAtom }
