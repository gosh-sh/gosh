import {
    GOSH_DAO_ABI,
    GOSH_WALLET_ABI,
    PROFILE_ABI,
    SYSTEM_CONTRACT_ABI,
} from '../eversdk/abi.ts'
import { SYSTEM_CONTRACT_ADDR } from '../eversdk/client.ts'
import { goshCli } from '../shortcuts.ts'

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
