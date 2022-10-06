import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
    goshBlobAtom,
    goshBranchesAtom,
    goshCurrBranchSelector,
    goshRepoBlobSelector,
    goshRepoTreeAtom,
    goshRepoTreeSelector,
} from '../store/gosh.state'
import {
    getRepoTree,
    AppConfig,
    ZERO_COMMIT,
    TCreateCommitCallbackParams,
    TGoshBranch,
    TSmvBalanceDetails,
    useGosh,
    useGoshVersions,
    TWalletDetails,
    retry,
} from 'react-gosh'
import { IGoshRepository, IGoshWallet } from 'react-gosh/dist/gosh/interfaces'
import { GoshSmvLocker } from 'react-gosh/dist/gosh/0.11.0/goshsmvlocker'
import { GoshCommit } from 'react-gosh/dist/gosh/0.11.0/goshcommit'
import { GoshSnapshot } from 'react-gosh/dist/gosh/0.11.0/goshsnapshot'

/** Create GoshRepository object */
export const useGoshRepo = (daoName?: string, name?: string) => {
    const gosh = useGosh()
    const [goshRepo, setGoshRepo] = useState<IGoshRepository>()

    useEffect(() => {
        const _getRepo = async () => {
            if (!gosh || !name || !daoName) return

            const repository = await gosh.getRepository({ name: `${daoName}/${name}` })
            setGoshRepo(repository)
        }

        _getRepo()
    }, [gosh, daoName, name])

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
            const tree = await retry(() => getRepoTree(repo, commitAddr, filterPath), 2)
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

export const useSmvBalance = (wallet?: {
    instance: IGoshWallet
    details: TWalletDetails
}) => {
    const { versions } = useGoshVersions()
    const [details, setDetails] = useState<TSmvBalanceDetails>({
        balance: 0,
        smvBalance: 0,
        smvLocked: 0,
        smvBusy: false,
        numClients: 0,
        goshBalance: 0,
        goshLockerBalance: 0,
    })

    useEffect(() => {
        const getDetails = async () => {
            if (!wallet || !wallet.details.isDaoMember) return

            const balance = await wallet.instance.getSmvTokenBalance()
            const goshBalance = parseInt(await wallet.instance.account.getBalance())/1e9
            const lockerAddr = await wallet.instance.getSmvLockerAddr()
            const locker = new GoshSmvLocker(AppConfig.goshclient, lockerAddr)
            const details = await locker.getDetails()
            setDetails((state) => ({
                ...state,
                balance,
                smvBalance: details.tokens.total,
                smvLocked: details.tokens.locked,
                smvBusy: details.isBusy,
                numClients: details.numClients,
                goshBalance: goshBalance,
                goshLockerBalance: details.goshLockerBalance,
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
    const { versions } = useGoshVersions()
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
