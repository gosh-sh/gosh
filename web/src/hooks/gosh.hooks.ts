import { KeyPair } from '@eversdk/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { getRepoTree } from '../helpers';
import {
    goshBranchesAtom,
    goshCurrBranchSelector,
    goshRepoBlobSelector,
    goshRepoTreeAtom,
    goshRepoTreeSelector,
} from '../store/gosh.state';
import { userStateAtom } from '../store/user.state';
import { GoshDao, GoshRoot, GoshWallet, GoshRepository } from '../types/classes';
import {
    IGoshDao,
    IGoshRepository,
    IGoshRoot,
    IGoshWallet,
    TCreateCommitCallbackParams,
    TGoshBranch,
} from '../types/types';
import { useEverClient } from './ever.hooks';

/** Create GoshRoot object */
export const useGoshRoot = () => {
    const client = useEverClient();

    return useMemo<IGoshRoot | undefined>(() => {
        const address = process.env.REACT_APP_GOSH_ADDR;
        if (client && address) {
            return new GoshRoot(client, address);
        }
    }, [client]);
};

export const useGoshDao = (name?: string) => {
    const goshRoot = useGoshRoot();
    const [goshDao, setGoshDao] = useState<IGoshDao>();

    useEffect(() => {
        const createDao = async (goshRoot: IGoshRoot, daoName: string) => {
            const daoAddr = await goshRoot.getDaoAddr(daoName);
            const dao = new GoshDao(goshRoot.account.client, daoAddr);
            await dao.load();
            setGoshDao(dao);
        };

        if (goshRoot && name) createDao(goshRoot, name);
    }, [goshRoot, name]);

    return goshDao;
};

export const useGoshWallet = (daoName?: string) => {
    const userState = useRecoilValue(userStateAtom);
    const goshDao = useGoshDao(daoName);
    const [goshWallet, setGoshWallet] = useState<IGoshWallet>();

    useEffect(() => {
        const createWallet = async (goshDao: IGoshDao, keys: KeyPair) => {
            const goshWalletAddr = await goshDao.getWalletAddr(`0x${keys.public}`, 0);
            const goshWallet = new GoshWallet(
                goshDao.account.client,
                goshWalletAddr,
                keys
            );

            const daoParticipants = await goshDao.getWallets();
            goshWallet.isDaoParticipant =
                daoParticipants.indexOf(goshWallet.address) >= 0;

            setGoshWallet(goshWallet);
        };

        if (goshDao && userState.keys) createWallet(goshDao, userState.keys);
    }, [goshDao, userState.keys]);

    return goshWallet;
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
        const filtered = branches?.filter(({ deployed, need }) => deployed >= need);
        if (filtered) setBranches(filtered);
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
