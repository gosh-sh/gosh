import { GOSH_DAO_ABI, GOSH_WALLET_ABI } from './abi.ts'
import { goshCli } from '../shortcuts.ts'

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
    repo_name: string,
    wallet_addr: string,
    seed: string,
): Promise<string> {
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
        JSON.stringify({
          nameRepo: repo_name,
          previous: null,
        }),
      )
      return profile_addr
    } else {
      const { value0: profile_addr } = await goshCli(
        'call',
        '--abi',
        GOSH_WALLET_ABI,
        wallet_addr,
        '--sign',
        seed,
        'AloneDeployRepository',
        JSON.stringify({
          nameRepo: repo_name,
          descr: '',
          previous: null,
        }),
      )
      return profile_addr
    }
}
