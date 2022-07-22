import { useMemo } from "react";
import { TonClient } from "@eversdk/core";
import { useRecoilValue } from "recoil";
import { everStateAtom } from "../store/ever.state";


export const useEverClient = () => {
    const everState = useRecoilValue(everStateAtom);

    const client = useMemo(() => {
        return new TonClient(everState.config);
    }, [everState.config]);

    return client;
}
