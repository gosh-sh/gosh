import React from "react";
import { atom } from "recoil";


export const appModalStateAtom = atom<
    {
        static?: boolean;
        isOpen: boolean;
        element: React.ReactElement | null;
    }
>({
    key: 'AppModalStateAtom',
    default: {
        static: false,
        isOpen: false,
        element: null
    }
});