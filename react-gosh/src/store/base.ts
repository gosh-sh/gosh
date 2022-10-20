import { recoilPersist } from 'recoil-persist'

const { persistAtom } = recoilPersist({ key: 'recoil' })

export { persistAtom }
