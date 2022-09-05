import { KeyPair } from '@eversdk/core'
import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
    goshBlobAtom,
    goshBranchesAtom,
    goshCurrBranchSelector,
    goshRepoBlobSelector,
    goshRepoTreeAtom,
    goshRepoTreeSelector,
    goshWalletAtom,
} from '../store/gosh.state'
import {
    GoshWallet,
    GoshRepository,
    GoshSmvLocker,
    GoshCommit,
    GoshSnapshot,
    getRepoTree,
    AppConfig,
    ZERO_COMMIT,
    userStateAtom,
    IGoshDao,
    IGoshRepository,
    IGoshRoot,
    IGoshWallet,
    TCreateCommitCallbackParams,
    TGoshBranch,
    TSmvBalanceDetails,
} from 'react-gosh'

export const useGoshWallet = (dao?: IGoshDao) => {
    const userState = useRecoilValue(userStateAtom)
    const [details, setDetails] = useRecoilState(goshWalletAtom)
    const [wallet, setWallet] = useState<IGoshWallet>()

    useEffect(() => {
        const getWallet = async (
            _dao: IGoshDao,
            _keys: KeyPair,
            state: { address?: string; daoAddress?: string },
        ) => {
            const { address, daoAddress } = state
            const gosh = await AppConfig.goshroot.getGosh(AppConfig.goshversion)
            const profileAddr = await gosh.getProfileAddr(`0x${_keys.public}`)

            let _wallet
            if (!address || daoAddress !== _dao.address) {
                console.debug('Get wallet hook (blockchain)')
                const _address = await _dao.getWalletAddr(profileAddr, 0)
                _wallet = new GoshWallet(_dao.account.client, _address, _keys)
            } else {
                console.debug('Get wallet hook (from state)')
                _wallet = new GoshWallet(_dao.account.client, address, _keys)

                /**
                 * Get DAO participants list and check if wallet is a member only
                 * in case of reading wallet from state, because hook works twice
                 * in case of reading from blockchain (blockchain then state).
                 *
                 * TODO: Create subscription for DAO messages (add member message)
                 * and apply it in this hook
                 */
                const _daoParticipants = await _dao.getWallets()
                _wallet.isDaoParticipant = _daoParticipants.indexOf(_wallet.address) >= 0
            }

            setWallet(_wallet)
            setDetails({
                address: _wallet.address,
                keys: _keys,
                daoAddress: _dao.address,
            })
        }

        if (dao && userState.keys) {
            getWallet(dao, userState.keys, {
                address: details?.address,
                daoAddress: details?.daoAddress,
            })
        }
    }, [dao, details?.address, details?.daoAddress, userState.keys, setDetails])

    return wallet
}

/** Create GoshRepository object */
export const useGoshRepo = (daoName?: string, name?: string) => {
    const [goshRepo, setGoshRepo] = useState<IGoshRepository>()

    useEffect(() => {
        const createRepo = async (root: IGoshRoot, daoName: string, name: string) => {
            const gosh = await root.getGosh(AppConfig.goshversion)
            const repoAddr = await gosh.getRepoAddr(name, daoName)
            const repository = new GoshRepository(root.account.client, repoAddr)
            setGoshRepo(repository)
        }

        if (AppConfig.goshroot && daoName && name)
            createRepo(AppConfig.goshroot, daoName, name)
    }, [daoName, name])

    return goshRepo
}

/** Reload GoshRepo branch/branches and update app state */
export const useGoshRepoBranches = (
    goshRepo?: IGoshRepository,
    branchName: string = 'main',
) => {
    const [branches, setBranches] = useRecoilState(goshBranchesAtom)
    const branch = useRecoilValue(goshCurrBranchSelector(branchName))

    const updateBranches = useCallback(async () => {
        const branches = await goshRepo?.getBranches()
        if (branches) setBranches(branches)
    }, [goshRepo, setBranches])

    const updateBranch = useCallback(
        async (branchName: string) => {
            const branch = await goshRepo?.getBranch(branchName)
            if (branch) {
                setBranches((currVal) =>
                    currVal.map((item) => (item.name !== branch.name ? item : branch)),
                )
            }
        },
        [goshRepo, setBranches],
    )

    return { branches, branch, updateBranch, updateBranches }
}

/** Get GoshRepo tree and selectors */
export const useGoshRepoTree = (
    repo?: IGoshRepository,
    branch?: TGoshBranch,
    filterPath?: string,
    isDisabled?: boolean,
) => {
    const [tree, setTree] = useRecoilState(goshRepoTreeAtom)
    const isEffectNeeded = !isDisabled || (isDisabled && !tree)

    const getSubtree = (path?: string) => goshRepoTreeSelector({ type: 'tree', path })
    const getTreeItems = (path?: string) => goshRepoTreeSelector({ type: 'items', path })
    const getTreeItem = (path?: string) => goshRepoBlobSelector(path)

    useEffect(() => {
        const getTree = async (repo: IGoshRepository, commitAddr: string) => {
            setTree(undefined)
            const tree = await getRepoTree(repo, commitAddr, filterPath)
            setTree(tree)
        }

        if (repo && branch?.commitAddr && isEffectNeeded) {
            getTree(repo, branch.commitAddr)
        }
    }, [repo, branch?.commitAddr, filterPath, isEffectNeeded, setTree])

    return { tree, getSubtree, getTreeItems, getTreeItem }
}

export const useCommitProgress = () => {
    const [progress, setProgress] = useState<TCreateCommitCallbackParams>({})

    const progressCallback = (params: TCreateCommitCallbackParams) => {
        setProgress((currVal) => ({ ...currVal, ...params }))
    }

    return { progress, progressCallback }
}

export const useSmvBalance = (wallet?: IGoshWallet) => {
    const [details, setDetails] = useState<TSmvBalanceDetails>({
        balance: 0,
        smvBalance: 0,
        smvLocked: 0,
        smvBusy: false,
    })

    useEffect(() => {
        const getDetails = async () => {
            if (!wallet || !wallet.isDaoParticipant) return

            const balance = await wallet.getSmvTokenBalance()
            const lockerAddr = await wallet.getSmvLockerAddr()
            const locker = new GoshSmvLocker(AppConfig.goshclient, lockerAddr)
            const details = await locker.getDetails()
            setDetails((state) => ({
                ...state,
                balance,
                smvBalance: details.tokens.total - details.tokens.locked,
                smvLocked: details.tokens.locked,
                smvBusy: details.isBusy,
            }))
        }

        getDetails()
        const interval = setInterval(async () => {
            try {
                await getDetails()
            } catch (e: any) {
                console.error(e.message)
            }
        }, 5000)

        return () => {
            clearInterval(interval)
        }
    }, [wallet])

    return details
}

export const useGoshBlob = (
    repo?: IGoshRepository,
    branchName?: string,
    path?: string,
    fromState: boolean = false,
) => {
    const [blob, setBlob] = useRecoilState(goshBlobAtom)
    const [isEffectNeeded] = useState<boolean>(!fromState || (fromState && !blob.address))
    const { branch } = useGoshRepoBranches(repo, branchName)
    const tree = useGoshRepoTree(repo, branch, path, !isEffectNeeded)
    const treeItem = useRecoilValue(tree.getTreeItem(path))

    useEffect(() => {
        const _getBlobDetails = async () => {
            setBlob({ isFetching: true })

            if (!repo || !branch?.name || !branch.commitAddr || !path) {
                setBlob({ isFetching: false })
                return
            }

            const commit = new GoshCommit(AppConfig.goshclient, branch.commitAddr)
            const commitName = await commit.getName()
            if (commitName === ZERO_COMMIT) {
                setBlob({ isFetching: false })
                return
            }

            const address = await repo.getSnapshotAddr(branch.name, path)
            console.debug('Snapshot address', address)
            setBlob((state) => ({
                ...state,
                path,
                address,
                commit: commitName,
            }))
        }

        if (isEffectNeeded) _getBlobDetails()
    }, [repo, branch?.name, branch?.commitAddr, path, isEffectNeeded, setBlob])

    useEffect(() => {
        const _getBlobContent = async () => {
            if (!blob.address || !blob.commit || !treeItem) return

            console.debug('Tree item', treeItem)
            const snap = new GoshSnapshot(AppConfig.goshclient, blob.address)
            const data = await snap.getSnapshot(blob.commit, treeItem)
            setBlob((state) => ({
                ...state,
                content: data.content,
                isIpfs: data.isIpfs,
                isFetching: false,
            }))
        }

        if (isEffectNeeded && blob.isFetching) _getBlobContent()
    }, [blob.address, blob.commit, blob.isFetching, treeItem, isEffectNeeded, setBlob])

    return { blob, treeItem }
}
