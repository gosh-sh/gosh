import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
    goshBranchesAtom,
    goshCurrBranchSelector,
    goshRepoBlobSelector,
    goshRepoTreeAtom,
    goshRepoTreeSelector,
} from '../store/gosh.state'
import { AppConfig, TSmvBalanceDetails, TWalletDetails, retry } from 'react-gosh'
import {
    IGoshDaoAdapter,
    IGoshRepositoryAdapter,
    IGoshWallet,
} from 'react-gosh/dist/gosh/interfaces'
import { GoshSmvLocker } from 'react-gosh/dist/gosh/0.11.0/goshsmvlocker'
import { TBranch, TPushCallbackParams } from 'react-gosh/dist/types/repo.types'

/** Reload GoshRepo branch/branches and update app state */
export const useGoshRepoBranches = (
    goshRepo?: IGoshRepositoryAdapter,
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
            console.debug('Update branch', branchName)
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
    repo?: IGoshRepositoryAdapter,
    branch?: TBranch,
    filterPath?: string,
    isDisabled?: boolean,
) => {
    const [tree, setTree] = useRecoilState(goshRepoTreeAtom)
    const isEffectNeeded = !isDisabled || (isDisabled && !tree)

    const getSubtree = (path?: string) => goshRepoTreeSelector({ type: 'tree', path })
    const getTreeItems = (path?: string) => goshRepoTreeSelector({ type: 'items', path })
    const getTreeItem = (path?: string) => goshRepoBlobSelector(path)

    useEffect(() => {
        const getTree = async (repo: IGoshRepositoryAdapter, commit: string) => {
            setTree(undefined)
            const tree = await retry(() => repo.getTree(commit, filterPath), 2)
            setTree(tree)
        }

        if (repo && branch?.commit.name && isEffectNeeded) {
            getTree(repo, branch.commit.name)
        }
    }, [repo, branch?.commit.name, filterPath, isEffectNeeded, setTree])

    return { tree, getSubtree, getTreeItems, getTreeItem }
}

export const useCommitProgress = () => {
    const [progress, setProgress] = useState<TPushCallbackParams>({})

    const progressCallback = (params: TPushCallbackParams) => {
        setProgress((currVal) => {
            const { treesDeploy, snapsDeploy, diffsDeploy, tagsDeploy } = params

            return {
                ...currVal,
                ...params,
                treesDeploy: { ...currVal.treesDeploy, ...treesDeploy },
                snapsDeploy: { ...currVal.snapsDeploy, ...snapsDeploy },
                diffsDeploy: { ...currVal.diffsDeploy, ...diffsDeploy },
                tagsDeploy: { ...currVal.tagsDeploy, ...tagsDeploy },
            }
        })
    }

    return { progress, progressCallback }
}

export const useSmvBalance = (dao: IGoshDaoAdapter, isAuthenticated: boolean) => {
    const [details, setDetails] = useState<TSmvBalanceDetails>({
        balance: 0,
        smvBalance: 0,
        smvLocked: 0,
        smvBusy: false,
    })

    useEffect(() => {
        const getDetails = async () => {
            if (!isAuthenticated) return

            const wallet = await dao._getWallet(0)
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
    }, [dao, isAuthenticated])

    return details
}
