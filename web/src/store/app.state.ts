import React from 'react'
import { atom } from 'recoil'

export const appContextAtom = atom<{ version: string | null }>({
    key: 'AppContextAtom',
    default: { version: null },
})

export const appModalStateAtom = atom<{
    static?: boolean
    isOpen: boolean
    element: React.ReactElement | null
}>({
    key: 'AppModalStateAtom',
    default: {
        static: false,
        isOpen: false,
        element: null,
    },
})
