import { atom } from 'recoil'

const goshStateAtom = atom<{
    latest?: string
    all: string[]
}>({
    key: 'GoshStateAtom',
    default: {
        all: [],
    },
})

export { goshStateAtom }
