import { GOSH_DAO_ABI, GOSH_WALLET_ABI } from './abi.ts'
import { goshCli } from '../shortcuts.ts'
import {
    ProposalStatus,
    countDaoMembers,
    createProposalRepoDeploy,
    findProposal,
} from './dao.ts'

export enum RepoStatus {
    Deploying,
    RejectedByVoting,
    WaitingVoting,
}

export async function getAddrRepository(
    repo_name: string,
    dao_addr: string,
): Promise<string> {
    const { value0: profile_addr } = await goshCli(
        'run',
        '--abi',
        GOSH_DAO_ABI,
        dao_addr,
        'getAddrRepository',
        JSON.stringify({ name: repo_name }),
    )
    return profile_addr
}

export async function getAddrWallet(
    user_profile_addr: string,
    dao_addr: string,
): Promise<string> {
    const { value0: profile_addr } = await goshCli(
        'run',
        '--abi',
        GOSH_DAO_ABI,
        dao_addr,
        'getAddrWallet',
        JSON.stringify({
            pubaddr: user_profile_addr,
            index: 0,
        }),
    )
    return profile_addr
}

export async function deployRepository(
    dao_addr: string,
    repo_name: string,
    wallet_addr: string,
    seed: string,
): Promise<RepoStatus> {
    const version = Deno.env.get('GOSH_VERSION') ?? ''
    if (version === '1.0.0') {
        const { value0: profile_addr } = await goshCli(
            'call',
            '--abi',
            GOSH_WALLET_ABI,
            wallet_addr,
            '--sign',
            seed,
            'deployRepository',
            JSON.stringify({ nameRepo: repo_name, previous: null }),
        )
        return RepoStatus.Deploying
    }

    const numOfMembers = await countDaoMembers(dao_addr)
    if (numOfMembers === 1) {
        const { value0: profile_addr } = await goshCli(
            'call',
            '--abi',
            GOSH_WALLET_ABI,
            wallet_addr,
            '--sign',
            seed,
            'AloneDeployRepository',
            JSON.stringify({ nameRepo: repo_name, descr: '', previous: null }),
        )
        return RepoStatus.Deploying
    }

    console.log(`DAO has ${numOfMembers} members. Proposal for deploying repo '${repo_name}' is required`)
    const status = await findProposal(dao_addr, '', repo_name)

    if (status === ProposalStatus.Accepted) {
        console.log(`Proposal to create repo '${repo_name}' was accepted. Deploying repo...`)
        const { value0: profile_addr } = await goshCli(
            'call',
            '--abi',
            GOSH_WALLET_ABI,
            wallet_addr,
            '--sign',
            seed,
            'AloneDeployRepository',
            JSON.stringify({ nameRepo: repo_name, descr: '', previous: null }),
        )
        return RepoStatus.Deploying
    } else if (status === ProposalStatus.Rejected) {
        console.log(`Proposal to create repo '${repo_name}' was rejected`)
        return RepoStatus.RejectedByVoting
    } else if (status === ProposalStatus.InProgress) {
        console.log(`Proposal to create repo '${repo_name}' is in the voting stage`)
        return RepoStatus.WaitingVoting
    } else if (status === ProposalStatus.NonExistent) {
        console.log(`Creating proposal to deploy repo '${repo_name}'`)
        await createProposalRepoDeploy(repo_name, wallet_addr, seed)
        return RepoStatus.WaitingVoting
    }
}
