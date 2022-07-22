// import { useMemo } from 'react';
// import { TonClient } from '@eversdk/core';
// import { useRecoilValue } from 'recoil';
// import { everStateAtom } from '../store/ever.state';
import { goshClient } from '../helpers';

/** Backward compatibility, remove hook after full refactor */
export const useEverClient = () => {
    // const everState = useRecoilValue(everStateAtom);
    // const configStr = JSON.stringify(everState.config);

    // const client = useMemo(() => {
    //     const config = JSON.parse(configStr);
    //     return new TonClient(config);
    // }, [configStr]);

    return goshClient;
};
