import { KeyPair } from '@eversdk/core';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { getRepoTree, goshClient, goshRoot } from '../helpers';
import {
    goshBranchesAtom,
    goshCurrBranchSelector,
    goshDaoAtom,
    goshRepoBlobSelector,
    goshRepoTreeAtom,
    goshRepoTreeSelector,
    goshWalletAtom,
} from '../store/gosh.state';
import { userStateAtom } from '../store/user.state';
import { GoshDao, GoshWallet, GoshRepository, GoshSmvLocker } from '../types/classes';
import {
    IGoshDao,
    IGoshRepository,
    IGoshRoot,
    IGoshWallet,
    TCreateCommitCallbackParams,
    TGoshBranch,
    TSmvBalanceDetails,
} from '../types/types';
// import { useEverClient } from './ever.hooks';

/** Create GoshRoot object */
/** Backward compatibility, remove hook after full refactor */
export const useGoshRoot = () => {
    return goshRoot;
    // const client = useEverClient();

    // return useMemo<IGoshRoot | undefined>(() => {
    //     const address = process.env.REACT_APP_GOSH_ADDR;
    //     if (client && address) {
    //         return new GoshRoot(client, address);
    //     }
    // }, [client]);
};

export const useGoshDao = (name?: string) => {
    const [details, setDetails] = useRecoilState(goshDaoAtom);
    const [dao, setDao] = useState<IGoshDao>();

    useEffect(() => {
        const getDao = async (
            _name: string,
            state: { name?: string; address?: string }
        ) => {
            if (!state.address || state.name !== _name) {
                console.debug('Get dao hook (blockchain)');
                const address = await goshRoot.getDaoAddr(_name);
                const dao = new GoshDao(goshRoot.account.client, address);
                const details = await dao.getDetails();
                setDao(dao);
                setDetails(details);
            } else {
                console.debug('Get dao hook (from state)');
                setDao(new GoshDao(goshRoot.account.client, state.address));
            }
        };

        if (name) getDao(name, { name: details?.name, address: details?.address });
    }, [name, details?.name, details?.address, setDetails]);

    return dao;
};

export const useGoshWallet = (dao?: IGoshDao) => {
    const userState = useRecoilValue(userStateAtom);
    const [details, setDetails] = useRecoilState(goshWalletAtom);
    const [wallet, setWallet] = useState<IGoshWallet>();

    useEffect(() => {
        const getWallet = async (
            _dao: IGoshDao,
            _keys: KeyPair,
            state: { address?: string; daoAddress?: string }
        ) => {
            const { address, daoAddress } = state;

            let _wallet;
            if (!address || daoAddress !== _dao.address) {
                console.debug('Get wallet hook (blockchain)');
                const _address = await _dao.getWalletAddr(`0x${_keys.public}`, 0);
                _wallet = new GoshWallet(_dao.account.client, _address, _keys);
            } else {
                console.debug('Get wallet hook (from state)');
                _wallet = new GoshWallet(_dao.account.client, address, _keys);

                /**
                 * Get DAO participants list and check if wallet is a member only
                 * in case of reading wallet from state, because hook works twice
                 * in case of reading from blockchain (blockchain then state).
                 *
                 * TODO: Create subscription for DAO messages (add member message)
                 * and apply it in this hook
                 */
                const _daoParticipants = await _dao.getWallets();
                _wallet.isDaoParticipant = _daoParticipants.indexOf(_wallet.address) >= 0;
            }

            setWallet(_wallet);
            setDetails({
                address: _wallet.address,
                keys: _keys,
                daoAddress: _dao.address,
            });
        };

        if (dao && userState.keys) {
            getWallet(dao, userState.keys, {
                address: details?.address,
                daoAddress: details?.daoAddress,
            });
        }
    }, [dao, details?.address, details?.daoAddress, userState.keys, setDetails]);

    return wallet;
};

/** Create GoshRepository object */
export const useGoshRepo = (daoName?: string, name?: string) => {
    const goshRoot = useGoshRoot();
    const [goshRepo, setGoshRepo] = useState<IGoshRepository>();

    useEffect(() => {
        const createRepo = async (root: IGoshRoot, daoName: string, name: string) => {
            const repoAddr = await root.getRepoAddr(name, daoName);
            const repository = new GoshRepository(root.account.client, repoAddr);
            setGoshRepo(repository);
        };

        if (goshRoot && daoName && name) createRepo(goshRoot, daoName, name);
    }, [goshRoot, daoName, name]);

    return goshRepo;
};

/** Reload GoshRepo branch/branches and update app state */
export const useGoshRepoBranches = (
    goshRepo?: IGoshRepository,
    branchName: string = 'main'
) => {
    const [branches, setBranches] = useRecoilState(goshBranchesAtom);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));

    const updateBranches = useCallback(async () => {
        const branches = await goshRepo?.getBranches();
        if (branches) setBranches(branches);
    }, [goshRepo, setBranches]);

    const updateBranch = useCallback(
        async (branchName: string) => {
            const branch = await goshRepo?.getBranch(branchName);
            if (branch) {
                setBranches((currVal) =>
                    currVal.map((item) => (item.name !== branch.name ? item : branch))
                );
            }
        },
        [goshRepo, setBranches]
    );

    return { branches, branch, updateBranch, updateBranches };
};

/** Get GoshRepo tree and selectors */
export const useGoshRepoTree = (
    repo?: IGoshRepository,
    branch?: TGoshBranch,
    filterPath?: string,
    disableEffect?: boolean
) => {
    const [tree, setTree] = useRecoilState(goshRepoTreeAtom);
    const needEffect = !disableEffect || (disableEffect && !tree);
    const branchStr = JSON.stringify(branch);

    const getSubtree = (path?: string) => goshRepoTreeSelector({ type: 'tree', path });
    const getTreeItems = (path?: string) => goshRepoTreeSelector({ type: 'items', path });
    const getTreeItem = (path?: string) => goshRepoBlobSelector(path);

    useEffect(() => {
        const getTree = async (repo: IGoshRepository, branch: TGoshBranch) => {
            setTree(undefined);
            const tree = await getRepoTree(repo, branch.commitAddr, filterPath);
            setTree(tree);
        };

        if (repo && branchStr && needEffect) {
            getTree(repo, JSON.parse(branchStr));
        }
    }, [repo, branchStr, filterPath, needEffect, setTree]);

    return { tree, getSubtree, getTreeItems, getTreeItem };
};

export const useCommitProgress = () => {
    const [progress, setProgress] = useState<TCreateCommitCallbackParams>({});

    const progressCallback = (params: TCreateCommitCallbackParams) => {
        setProgress((currVal) => ({ ...currVal, ...params }));
    };

    return { progress, progressCallback };
};

export const useSmvBalance = (wallet?: IGoshWallet) => {
    const [details, setDetails] = useState<TSmvBalanceDetails>({
        balance: 0,
        smvBalance: 0,
        smvLocked: 0,
        smvBusy: false,
    });

    useEffect(() => {
        const getDetails = async () => {
            if (!wallet || !wallet.isDaoParticipant) return;

            const balance = await wallet.getSmvTokenBalance();
            const lockerAddr = await wallet.getSmvLockerAddr();
            const locker = new GoshSmvLocker(goshClient, lockerAddr);
            const details = await locker.getDetails();
            setDetails((state) => ({
                ...state,
                balance,
                smvBalance: details.tokens.total,
                smvLocked: details.tokens.locked,
                smvBusy: details.isBusy,
            }));
        };

        getDetails();
        const interval = setInterval(async () => {
            await getDetails();
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [wallet]);

    return details;
};
