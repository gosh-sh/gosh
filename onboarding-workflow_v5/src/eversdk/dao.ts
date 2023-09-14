import {
    GOSH_DAO_ABI,
    GOSH_WALLET_ABI,
    PROFILE_ABI,
    SYSTEM_CONTRACT_ABI,
} from '../eversdk/abi.ts'
import { GOSH_ENDPOINTS, SYSTEM_CONTRACT_ADDR, getEverClient } from '../eversdk/client.ts'
import { goshCli } from '../shortcuts.ts'

export enum ProposalStatus {
    Accepted,
    Rejected,
    InProgress,
    NonExistent.
}

export async function getAddrDao(dao_name: string): Promise<string> {
    const { value0 } = await goshCli(
        'run',
        '--abi',
        SYSTEM_CONTRACT_ABI,
        SYSTEM_CONTRACT_ADDR,
        'getAddrDao',
        JSON.stringify({ name: dao_name }),
    )
    return value0
}

export async function setRepoUpdated(
    wallet_addr: string,
    seed: string,
): Promise<unknown> {
    // arguments not like in profile but in system contract
    return await goshCli(
        'call',
        '--abi',
        GOSH_WALLET_ABI,
        wallet_addr,
        '--sign',
        seed,
        'setRepoUpgraded',
        JSON.stringify({
            res: true
        }),
    )
}

export async function deployDao(
  dao_name: string,
  profile_addr: string,
  seed: string,
): Promise<unknown> {
    // arguments not like in profile but in system contract
    return await goshCli(
      'call',
      '--abi',
      PROFILE_ABI,
      profile_addr,
      '--sign',
      seed,
      'deployDao',
      JSON.stringify({
          systemcontract: SYSTEM_CONTRACT_ADDR,
          name: dao_name,
          pubmem: [profile_addr],
          previous: null,
      }),
    )
}

export async function turnOnDao(
    wallet_addr: string,
    profile_addr: string,
    wallet_pubkey: string,
    seed: string,
): Promise<any> {
    if (!wallet_pubkey.startsWith('0x')) {
        wallet_pubkey = `0x${wallet_pubkey}`
    }
    return await goshCli(
        'call',
        '--abi',
        PROFILE_ABI,
        profile_addr,
        '--sign',
        seed,
        'turnOn',
        JSON.stringify({ pubkey: wallet_pubkey, wallet: wallet_addr }),
    )
}

export async function isDaoMember(
    dao_addr: string,
    profile_addr: string,
): Promise<boolean> {
    const { value0 } = await goshCli(
        'run',
        '--abi',
        GOSH_DAO_ABI,
        dao_addr,
        'isMember',
        JSON.stringify({ pubaddr: profile_addr }),
    )
    return value0
}

export async function getDaoMembers(dao_addr: string): Promise<any> {
    const { value0 } = await goshCli(
        'run',
        '--abi',
        GOSH_DAO_ABI,
        dao_addr,
        'getWalletsFull',
        JSON.stringify({}),
    )
    return value0
}

export async function countDaoMembers(dao_addr: string): Promise<number> {
    const members_list = await getDaoMembers(dao_addr)

    return Object.keys(members_list).length
}

export async function getMemberName(profile_addr: string) {
    const { value0 } = await goshCli(
        'run',
        '--abi',
        PROFILE_ABI,
        profile_addr,
        'getName',
        JSON.stringify({}),
    )

    return value0
}

export async function getDaoMemberNames(dao_addr: string): Promise<string[]> {
    const members_list = await getDaoMembers(dao_addr)
    const promises = Object.keys(members_list).map(p => getMemberName(`0:${p.slice(2)}`))

    return (await Promise.allSettled(promises))
        .filter(v => v.status == 'fulfilled')
        .map(({ value }) => value)
}

export async function setAloneDaoConfig(
    tokens: number,
    wallet_addr: string,
    seed: string,
): Promise<boolean> {
    return await goshCli(
        'call',
        '--abi',
        GOSH_WALLET_ABI,
        wallet_addr,
        '--sign',
        seed,
        'AloneSetConfigDao',
        JSON.stringify({ newtoken: tokens }),
    )
}

export async function deployAloneDaoWallet(
    profile_address: string[],
    wallet_addr: string,
    seed: string,
): Promise<boolean> {
    return await goshCli(
        'call',
        '--abi',
        GOSH_WALLET_ABI,
        wallet_addr,
        '--sign',
        seed,
        'AloneDeployWalletDao',
        JSON.stringify({ pubaddr: profile_address }),
    )
}

export async function deployAloneDaoWallet_v2(
  profile_address: string,
  wallet_addr: string,
  seed: string,
  tokens: number,
): Promise<boolean> {
    return await goshCli(
      'call',
      '--abi',
      GOSH_WALLET_ABI,
      wallet_addr,
      '--sign',
      seed,
      'AloneDeployWalletDao',
      JSON.stringify({ pubaddr: [ { member: profile_address, count: tokens} ] }),
    )
}

export async function deployAloneDaoWallet_v5(
    profile_address: string,
    wallet_addr: string,
    seed: string,
    tokens: number,
): Promise<boolean> {
    return await goshCli(
        'call',
        '--abi',
        GOSH_WALLET_ABI,
        wallet_addr,
        '--sign',
        seed,
        'AloneDeployWalletDao',
        JSON.stringify({ pubaddr: [ { member: profile_address, count: tokens, expired: 0} ] }),
    )
}

export async function AloneMintDaoReserve(
  tokens: number,
  wallet_addr: string,
  seed: string,
): Promise<boolean> {
    return await goshCli(
      'call',
      '--abi',
      GOSH_WALLET_ABI,
      wallet_addr,
      '--sign',
      seed,
      'AloneMintDaoReserve',
      JSON.stringify({ token: tokens }),
    )
}

export async function findProposal(
    dao_addr: string,
    kind: string,
    repo_name: string
): Promise<ProposalStatus> {
    const code_hash = await getProposalCodeHash(dao_addr)

    console.log(`Searching proposals for DAO <${dao_addr}>...`)
    const args = [`${Deno.cwd()}/bin/find_proposal.sh`, code_hash, repo_name]
    const command = new Deno.Command('bash', {
        args,
        env: {
            'NETWORK': GOSH_ENDPOINTS
        }
    })
    const result = await command.output()
    const stdout = (new TextDecoder().decode(result.stdout)).trim()
    const stderr = new TextDecoder().decode(result.stderr)

    if (stderr) {
        console.log('[findProposal()] Stderr:', stderr)
    }
    console.log('[findProposal()] Status:', result)
    if (result.success) {
        console.log(`[findProposal()] Stdout: [${stdout}]`)
        if (stdout === "true") {
            return ProposalStatus.Accepted
        } else if (stdout === "false") {
            return ProposalStatus.Rejected
        } else if (stdout === "null") {
            return ProposalStatus.InProgress
        }
        return ProposalStatus.NonExistent
    }
    throw new Error(`Process "${args}" return code ${result.code}\n${stdout}`)
}

async function getProposalCodeHash(dao_addr: string): Promise<string> {
    const { value0: boc } = await goshCli(
        'run',
        '--abi',
        GOSH_DAO_ABI,
        dao_addr,
        'getProposalCode',
        JSON.stringify({}),
    )
    const { hash } = await getEverClient().boc.get_boc_hash({ boc })
    console.log(`Proposals code hash for DAO <${dao_addr}>: ${hash}`)
    return hash
}

export async function createProposalRepoDeploy(
    repo_name: string,
    wallet_addr: string,
    seed: string,
): Promise<string> {
    await goshCli(
        'call',
        wallet_addr,
        '--abi',
        GOSH_WALLET_ABI,
        '--sign',
        seed,
        'startProposalForDeployRepository',
        JSON.stringify({
            nameRepo: repo_name,
            descr: '',
            previous: null,
            comment: '',
            num_clients: 1,
            reviewers: []
        })
    )
}

// async function getDaoProposals(dao_addr: string): Promise<any[]> {
//     const code_hash = await getProposalCodeHash(dao_addr)

//     const query = `query AccountsQuery($code_hash: String) {
//         accounts(
//             filter: {
//                 code_hash: { eq: $code_hash },
//             }
//         ) { id }
//     }`

//     const result = await getEverClient().net.query({
//         query,
//         variables: { code_hash }
//     })

//     console.log("RESULT:", result)
//     return null
// }