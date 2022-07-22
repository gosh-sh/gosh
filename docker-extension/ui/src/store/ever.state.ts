import { atom } from "recoil";
import { getEndpoints } from "./../utils";
import { TEverState } from "./../types/types";


export const everStateAtom = atom<TEverState>({
    key: 'EverStateAtom',
    default: {
        config: {
            network: {
                endpoints: getEndpoints()
            }
        }
    }
});