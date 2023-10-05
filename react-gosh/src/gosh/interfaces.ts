import { Account, AccountRunLocalOptions, AccountRunOptions } from '@eversdk/appkit'
import {
    DecodedMessageBody,
    KeyPair,
    ResultOfProcessMessage,
    TonClient,
} from '@eversdk/core'
import {
    TAddress,
    TEventMultipleCreateProposalParams,
    TDao,
    TDaoMember,
    TProfileDetails,
    TSmvDetails,
    TSmvEvent,
    TSmvEventMinimal,
    TSmvEventStatus,
    TSmvEventTime,
    TSmvEventVotes,
    TValidationResult,
    TDaoMemberCreateParams,
    TDaoMemberDeleteParams,
    TDaoUpgradeParams,
    TDaoVotingTokenAddParams,
    TDaoRegularTokenAddParams,
    TDaoMintTokenParams,
    TDaoTagCreateParams,
    TDaoTagDeleteParams,
    TDaoMintDisableParams,
    TDaoMemberAllowanceUpdateParams,
    TDaoEventAllowDiscussionParams,
    TDaoEventShowProgressParams,
    TTaskDetails,
    IPushCallback,
    ITBranchOperateCallback,
    TBranch,
    TCommit,
    TRepositoryCreateParams,
    TRepositoryCreateResult,
    TRepository,
    TCommitTag,
    TTaskCommitConfig,
    TTree,
    TTreeItem,
    TUpgradeData,
    TRepositoryUpdateDescriptionParams,
    TRepositoryChangeBranchProtectionParams,
    TTaskDeleteParams,
    TTaskCreateParams,
    TRepositoryTagCreateParams,
    TRepositoryTagDeleteParams,
    TTaskReceiveBountyParams,
    TDaoEventSendReviewParams,
    TDaoAskMembershipAllowanceParams,
    TTopic,
    TTopicCreateParams,
    TTopicMessageCreateParams,
    TRepositoryChangeBranchProtectionResult,
    TDaoMemberCreateResult,
    TDaoMemberDeleteResult,
    TDaoUpgradeResult,
    TTaskCreateResult,
    TTaskDeleteResult,
    TDaoVotingTokenAddResult,
    TDaoRegularTokenAddResult,
    TDaoMintTokenResult,
    TDaoMintDisableResult,
    TDaoTagCreateResult,
    TDaoTagDeleteResult,
    TDaoMemberAllowanceUpdateResult,
    TRepositoryTagCreateResult,
    TRepositoryTagDeleteResult,
    TRepositoryUpdateDescriptionResult,
    TDaoEventAllowDiscussionResult,
    TDaoEventShowProgressResult,
    TDaoAskMembershipAllowanceResult,
    TRepositoryCreateCommitTagParams,
    TIsMemberParams,
    TIsMemberResult,
    TEventMultipleCreateProposalAsDaoParams,
    TDaoTokenDaoSendParams,
    TUserParam,
    TTaskTransferParams,
    TTaskTransferResult,
    TTaskUpgradeCompleteParams,
    TTaskUpgradeCompleteResult,
    TDaoVoteParams,
    TDaoVoteResult,
    TDaoReviewParams,
    TDaoReviewResult,
    TTaskReceiveBountyDaoParams,
    TTaskReceiveBountyDaoResult,
    TDaoTokenDaoLockParams,
    TDaoTokenDaoLockResult,
    TTaskUpgradeParams,
    TTaskUpgradeResult,
    TDaoTokenDaoTransferParams,
    TDaoTokenDaoTransferResult,
    TUpgradeVersionControllerParams,
    TUpgradeVersionControllerResult,
    TDaoStartPaidMembershipParams,
    TDaoStartPaidMembershipResult,
    TDaoStopPaidMembershipParams,
    TDaoStopPaidMembershipResult,
    TCodeCommentThreadCreateParams,
    TCodeCommentThreadCreateResult,
    TCodeCommentThreadGetCodeParams,
    TCodeCommentThreadGetCodeResult,
    TCodeCommentThreadGetParams,
    TCodeCommentThreadGetResult,
    TCodeCommentCreateParams,
    TCodeCommentCreateResult,
    TBigTaskCreateParams,
    TBigTaskCreateResult,
    TSubTaskCreateParams,
    TSubTaskCreateResult,
    TSubTaskDeleteParams,
    TSubTaskDeleteResult,
    TBigTaskApproveParams,
    TBigTaskApproveResult,
    TBigTaskDeleteParams,
    TBigTaskDeleteResult,
    TBigTaskUpgradeParams,
    TBigTaskUpgradeResult,
    TCodeCommentThreadResdolveParams,
    TCodeCommentThreadResolveResult,
    TBigTaskDetails,
    TEventSignleCreateProposalParams,
} from '../types'

interface IGoshAdapter {
    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    isValidUsername(username: string): TValidationResult
    isValidDaoName(name: string): TValidationResult
    isValidRepoName(name: string): TValidationResult
    isValidProfile(username: string[]): Promise<{ username: string; address: TAddress }[]>
    isValidDao(name: string[]): Promise<{ username: string; address: TAddress }[]>
    isValidUser(user: TUserParam): Promise<{ user: TUserParam; address: TAddress }>

    setAuth(username: string, keys: KeyPair): Promise<void>
    resetAuth(): Promise<void>

    getVersion(): string
    getProfile(options: {
        username?: string
        address?: TAddress
        keys?: KeyPair
    }): Promise<IGoshProfile>
    getDao(options: {
        name?: string
        address?: TAddress
        useAuth?: boolean
    }): Promise<IGoshDaoAdapter>
    getDaoProfile(options: { name?: string; address?: string }): Promise<IGoshProfileDao>
    getUserByAddress(address: TAddress): Promise<TUserParam>
    /**
     * Does not support repository authentication.
     * Good for use to get read-only repository.
     * If repository authentication needed, use `getRepository` from DAO adapter
     */
    getRepository(options: {
        path?: string
        address?: TAddress
    }): Promise<IGoshRepositoryAdapter>
    getRepositoryCodeHash(dao: TAddress): Promise<string>
    getTvmHash(data: string | Buffer): Promise<string>
    getTaskTagGoshCodeHash(tag: string): Promise<string>
    getTaskTagDaoCodeHash(dao: TAddress, tag: string): Promise<string>
    getTaskTagRepoCodeHash(
        dao: TAddress,
        repository: TAddress,
        tag: string,
    ): Promise<string>
    getHelperTag(address: TAddress): Promise<IGoshHelperTag>
    getCommitTag(params: {
        address?: string
        data?: { daoName: string; repoName: string; tagName: string }
    }): Promise<IGoshCommitTag>

    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>
}

interface IGoshDaoAdapter {
    // TODO: remove from public
    dao: IGoshDao
    wallet?: IGoshWallet
    // End todo

    isDeployed(): Promise<boolean>
    isRepositoriesUpgraded(): Promise<boolean>
    isMember(params: TIsMemberParams): TIsMemberResult

    setAuth(username: string, keys: KeyPair): Promise<void>

    getGosh(): IGoshAdapter
    getAddress(): TAddress
    getName(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TDao>
    getShortDescription(): Promise<string | null>
    getDescription(): Promise<string | null>
    getRemoteConfig(): Promise<object>
    getRepository(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshRepositoryAdapter>
    getMembers(): Promise<TDaoMember[]>
    getMemberWallet(options: {
        profile?: TAddress
        address?: TAddress
        index?: number
        create?: boolean
        keys?: KeyPair
    }): Promise<IGoshWallet>
    getReviewers(
        user: TUserParam[],
    ): Promise<{ username: string; profile: TAddress; wallet: TAddress }[]>

    getTaskCodeHash(repository: string): Promise<string>
    getTaskAccount(options: {
        repository?: string
        name?: string
        address?: TAddress
    }): Promise<IGoshTask>
    getTask(options: {
        repository?: string
        name?: string
        address?: TAddress
    }): Promise<TTaskDetails>
    getBigTask(options: { name?: string; address?: TAddress }): Promise<TBigTaskDetails>

    getTopicCodeHash(): Promise<string>
    getTopic(params: { address?: TAddress }): Promise<TTopic>

    getCodeCommetThreadCodeHash(
        params: TCodeCommentThreadGetCodeParams,
    ): Promise<TCodeCommentThreadGetCodeResult>
    getCodeCommentThread(
        params: TCodeCommentThreadGetParams,
    ): Promise<TCodeCommentThreadGetResult>

    getSmv(): Promise<IGoshSmvAdapter>
    getPrevDao(): Promise<IGoshDaoAdapter | null>

    createRepository(params: TRepositoryCreateParams): Promise<TRepositoryCreateResult>

    createMember(params: TDaoMemberCreateParams): Promise<TDaoMemberCreateResult>
    deleteMember(params: TDaoMemberDeleteParams): Promise<TDaoMemberDeleteResult>
    updateMemberAllowance(
        params: TDaoMemberAllowanceUpdateParams,
    ): Promise<TDaoMemberAllowanceUpdateResult>
    updateAskMembershipAllowance(
        params: TDaoAskMembershipAllowanceParams,
    ): Promise<TDaoAskMembershipAllowanceResult>

    upgrade(params: TDaoUpgradeParams): Promise<TDaoUpgradeResult>
    setRepositoriesUpgraded(): Promise<void>

    mint(params: TDaoMintTokenParams): Promise<TDaoMintTokenResult>
    disableMint(params: TDaoMintDisableParams): Promise<TDaoMintDisableResult>
    addVotingTokens(params: TDaoVotingTokenAddParams): Promise<TDaoVotingTokenAddResult>
    addRegularTokens(
        params: TDaoRegularTokenAddParams,
    ): Promise<TDaoRegularTokenAddResult>
    sendInternal2Internal(user: TUserParam, amount: number): Promise<void>
    send2DaoReserve(amount: number): Promise<void>
    sendDaoToken(params: TDaoTokenDaoSendParams): Promise<void>
    voteDao(params: TDaoVoteParams): Promise<TDaoVoteResult>
    reviewDao(params: TDaoReviewParams): Promise<TDaoReviewResult>
    receiveTaskBountyDao(
        params: TTaskReceiveBountyDaoParams,
    ): Promise<TTaskReceiveBountyDaoResult>
    lockDaoToken(params: TDaoTokenDaoLockParams): Promise<TDaoTokenDaoLockResult>
    transferDaoToken(
        params: TDaoTokenDaoTransferParams,
    ): Promise<TDaoTokenDaoTransferResult>

    createTag(params: TDaoTagCreateParams): Promise<TDaoTagCreateResult>
    deleteTag(params: TDaoTagDeleteParams): Promise<TDaoTagDeleteResult>

    createSingleProposal(params: TEventSignleCreateProposalParams): Promise<void>
    createMultiProposal(params: TEventMultipleCreateProposalParams): Promise<void>
    createMultiProposalAsDao(
        params: TEventMultipleCreateProposalAsDaoParams,
    ): Promise<void>

    createTask(params: TTaskCreateParams): Promise<TTaskCreateResult>
    receiveTaskBounty(params: TTaskReceiveBountyParams): Promise<void>
    deleteTask(params: TTaskDeleteParams): Promise<TTaskDeleteResult>
    transferTask(params: TTaskTransferParams): Promise<TTaskTransferResult>
    upgradeTask(params: TTaskUpgradeParams): Promise<TTaskUpgradeResult>
    upgradeTaskComplete(
        params: TTaskUpgradeCompleteParams,
    ): Promise<TTaskUpgradeCompleteResult>

    createBigTask(params: TBigTaskCreateParams): Promise<TBigTaskCreateResult>
    approveBigTask(params: TBigTaskApproveParams): Promise<TBigTaskApproveResult>
    deleteBigTask(params: TBigTaskDeleteParams): Promise<TBigTaskDeleteResult>
    receiveBigTaskBounty(params: TTaskReceiveBountyParams): Promise<void>
    upgradeBigTask(params: TBigTaskUpgradeParams): Promise<TBigTaskUpgradeResult>
    createSubTask(params: TSubTaskCreateParams): Promise<TSubTaskCreateResult>
    deleteSubTask(params: TSubTaskDeleteParams): Promise<TSubTaskDeleteResult>

    sendEventReview(params: TDaoEventSendReviewParams): Promise<void>
    updateEventShowProgress(
        params: TDaoEventShowProgressParams,
    ): Promise<TDaoEventShowProgressResult>
    updateEventAllowDiscussion(
        params: TDaoEventAllowDiscussionParams,
    ): Promise<TDaoEventAllowDiscussionResult>

    createTopic(params: TTopicCreateParams): Promise<void>
    createTopicMessage(params: TTopicMessageCreateParams): Promise<void>

    upgradeVersionController(
        params: TUpgradeVersionControllerParams,
    ): Promise<TUpgradeVersionControllerResult>

    startPaidMembership(
        params: TDaoStartPaidMembershipParams,
    ): Promise<TDaoStartPaidMembershipResult>
    stopPaidMembership(
        params: TDaoStopPaidMembershipParams,
    ): Promise<TDaoStopPaidMembershipResult>

    createCodeCommentThread(
        params: TCodeCommentThreadCreateParams,
    ): Promise<TCodeCommentThreadCreateResult>
    resolveCodeCommentThread(
        params: TCodeCommentThreadResdolveParams,
    ): Promise<TCodeCommentThreadResolveResult>
    createCodeComment(params: TCodeCommentCreateParams): Promise<TCodeCommentCreateResult>
}

interface IGoshRepositoryAdapter {
    auth?: any
    repo: IGoshRepository

    isDeployed(): Promise<boolean>

    getGosh(): IGoshAdapter
    getAddress(): TAddress
    getName(): Promise<string>
    getHead(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TRepository>
    getTree(
        commit: string | TCommit,
        search?: string,
    ): Promise<{ tree: TTree; items: TTreeItem[] }>
    getBlob(options: {
        commit?: string
        fullpath?: string
        address?: TAddress
    }): Promise<{
        address: string
        onchain: { commit: string; content: string }
        content: string | Buffer
        ipfs: boolean
    }>
    getCommit(options: { name?: string; address?: TAddress }): Promise<TCommit>
    _getCommit(options: { name?: string; address?: TAddress }): Promise<IGoshCommit>
    getCommitBlob(
        treepath: string,
        branch: string,
        commit: string | TCommit,
    ): Promise<{ address: string; previous: string | Buffer; current: string | Buffer }>
    getCommitBlobs(
        branch: string,
        commit: string | TCommit,
    ): Promise<{ address: string; treepath: string }[]>
    getPullRequestBlob(
        item: { treepath: string; index: number },
        commit: string | TCommit,
    ): Promise<{ address: string; previous: string | Buffer; current: string | Buffer }>
    getPullRequestBlobs(
        commit: string | TCommit,
    ): Promise<{ address: string; treepath: string; index: number }[]>
    getBranch(name: string): Promise<TBranch>
    _getBranch(name: string): Promise<any>
    getBranches(): Promise<TBranch[]>
    getCommitTags(): Promise<TCommitTag[]>
    getUpgrade(commit: string): Promise<TUpgradeData>
    getContentSignature(
        repository: string,
        commit: string,
        label: string,
    ): Promise<string>
    getIncomingCommits(): Promise<{ branch: string; commit: TCommit }[]>
    subscribeIncomingCommits(
        callback: (incoming: { branch: string; commit: TCommit }[]) => void,
    ): Promise<void>
    unsubscribe(): Promise<void>

    createBranch(
        name: string,
        from: string,
        callback?: ITBranchOperateCallback,
    ): Promise<void>
    deleteBranch(name: string, callback?: ITBranchOperateCallback): Promise<void>
    lockBranch(
        params: TRepositoryChangeBranchProtectionParams,
    ): Promise<TRepositoryChangeBranchProtectionResult>
    unlockBranch(
        params: TRepositoryChangeBranchProtectionParams,
    ): Promise<TRepositoryChangeBranchProtectionResult>

    setHead(branch: string): Promise<void>
    push(
        branch: string,
        blobs: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
        }[],
        message: string,
        isPullRequest: boolean,
        options: {
            tags?: string
            branchParent?: string
            task?: TTaskCommitConfig
            callback?: IPushCallback
        },
    ): Promise<void>
    pushUpgrade(
        data: TUpgradeData,
        options: { setCommit?: boolean; callback?: IPushCallback },
    ): Promise<void>
    createCommitTag(params: TRepositoryCreateCommitTagParams): Promise<void>

    deployContentSignature(
        repository: string,
        commit: string,
        label: string,
        content: string,
    ): Promise<void>

    createTag(params: TRepositoryTagCreateParams): Promise<TRepositoryTagCreateResult>
    deleteTag(params: TRepositoryTagDeleteParams): Promise<TRepositoryTagDeleteResult>

    updateDescription(
        params: TRepositoryUpdateDescriptionParams,
    ): Promise<TRepositoryUpdateDescriptionResult>
}

interface IGoshSmvAdapter {
    getTotalSupply(): Promise<number>
    getDetails(wallet?: IGoshWallet): Promise<TSmvDetails>
    getClientsCount(): Promise<number>
    getEventCodeHash(): Promise<string>
    getEvent(
        address: TAddress,
        isDetailed?: boolean,
    ): Promise<TSmvEventMinimal | TSmvEvent>
    getEventReviewers(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<string[]>
    getEventVotes(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<TSmvEventVotes>
    getEventStatus(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<TSmvEventStatus>
    getEventTime(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<TSmvEventTime>
    getWalletBalance(wallet: IGoshWallet): Promise<number>

    validateProposalStart(min?: number): Promise<void>

    transferToSmv(amount: number): Promise<void>
    transferToWallet(amount: number): Promise<void>
    releaseAll(): Promise<void>

    vote(event: TAddress, choice: boolean, amount: number, note?: string): Promise<void>
}

interface IContract {
    address: TAddress
    account: Account
    version: string

    isDeployed(): Promise<boolean>
    boc(): Promise<string>
    data(): Promise<string>
    getMessages(
        variables: {
            msgType: string[]
            node?: string[]
            cursor?: string
            limit?: number
            allow_latest_inconsistent_data?: boolean
        },
        decode?: boolean,
        all?: boolean,
        messages?: any[],
    ): Promise<{ cursor?: string; messages: any[]; hasNext?: boolean }>
    run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        settings?: { logging?: boolean; retries?: number },
    ): Promise<ResultOfProcessMessage>
    runLocal(
        functionName: string,
        input: object,
        options?: AccountRunLocalOptions,
        settings?: { logging?: boolean; retries?: number; useCachedBoc?: boolean },
    ): Promise<any>
    decodeMessageBody(body: string, type: number): Promise<DecodedMessageBody | null>
    decodeAccountData(data?: string): Promise<any>
}

interface IGoshRoot extends IContract {
    address: TAddress

    getProfileIndex(options: {
        address?: TAddress
        pubkey?: string
        username?: string
    }): Promise<IGoshProfileIndex>
    getProfileIndexes(
        pubkey: string,
    ): Promise<{ pubkey: string; name: string; profile: TAddress }[]>
}

interface IGoshProfile extends IContract {
    address: TAddress

    isOwnerPubkey(pubkey: string): Promise<boolean>

    getName(): Promise<string>
    getDetails(): Promise<TProfileDetails>
    getProfileDao(name: string): Promise<IGoshProfileDao>
    getDaos(): Promise<IGoshDaoAdapter[]>
    getOwners(): Promise<string[]>
    getGoshAddress(): Promise<TAddress>
    getVersion(): Promise<string>

    deployDao(
        gosh: IGoshAdapter,
        name: string,
        members: TAddress[],
        prev?: TAddress,
    ): Promise<IGoshDaoAdapter>

    setGoshAddress(address: TAddress): Promise<void>
    turnOn(wallet: TAddress, pubkey: string, keys: KeyPair): Promise<void>
}

interface IGoshProfileDao extends IContract {
    address: TAddress
}

interface IGosh extends IContract {
    address: TAddress
}

interface IGoshProfileIndex extends IContract {
    address: TAddress
}

interface IGoshDao extends IContract {
    address: TAddress
}

interface IGoshRepository extends IContract {
    address: TAddress

    getName(): Promise<string>
}

interface IGoshWallet extends IContract {
    address: TAddress
}

interface IGoshCommit extends IContract {
    address: TAddress
}

interface IGoshDiff extends IContract {
    address: TAddress
}

interface IGoshSnapshot extends IContract {
    address: TAddress

    getName(): Promise<string>
}

interface IGoshTree extends IContract {
    address: TAddress
}

interface IGoshCommitTag extends IContract {
    address: TAddress
}

interface IGoshTask extends IContract {
    address: TAddress
}

interface IGoshBigTask extends IContract {
    address: TAddress
}

interface IGoshHelperTag extends IContract {
    address: TAddress
}

interface IGoshTopic extends IContract {
    address: TAddress
}

interface IGoshContentSignature extends IContract {
    address: TAddress
}

interface IGoshSmvProposal extends IContract {
    address: TAddress
}

interface IGoshSmvLocker extends IContract {
    address: TAddress
}

interface IGoshSmvClient extends IContract {
    address: TAddress
}

interface IGoshSmvTokenRoot extends IContract {
    address: TAddress
}

export {
    IGoshAdapter,
    IGoshDaoAdapter,
    IGoshRepositoryAdapter,
    IGoshSmvAdapter,
    IContract,
    IGoshRoot,
    IGoshProfile,
    IGoshProfileDao,
    IGosh,
    IGoshProfileIndex,
    IGoshDao,
    IGoshRepository,
    IGoshWallet,
    IGoshCommit,
    IGoshDiff,
    IGoshSnapshot,
    IGoshTree,
    IGoshCommitTag,
    IGoshTask,
    IGoshBigTask,
    IGoshHelperTag,
    IGoshTopic,
    IGoshContentSignature,
    IGoshSmvProposal,
    IGoshSmvLocker,
    IGoshSmvClient,
    IGoshSmvTokenRoot,
}
