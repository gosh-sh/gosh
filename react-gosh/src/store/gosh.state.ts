import { atom } from 'recoil'
import { persistAtom } from './base'

const goshVersionsAtom = atom<{
    latest: string
    all: { version: string; address: string }[]
    isFetching: boolean
}>({
    key: 'GoshVersionsAtom',
    default: {
        latest: '',
        all: [],
        isFetching: true,
    },
    effects_UNSTABLE: [persistAtom],
})

export { goshVersionsAtom }
