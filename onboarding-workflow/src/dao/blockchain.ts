import { PROFILE_ABI, SYSTEM_CONTRACT_ABI } from '../eversdk/abi.ts'
import { SYSTEM_CONTRACT_ADDR } from '../eversdk/client.ts'
import { tonosCli } from '../shortcuts.ts'

export async function getAddrDao(dao_name: string): Promise<string> {
    const { value0 } = await tonosCli(
        'run',
        '--abi',
        SYSTEM_CONTRACT_ABI,
        SYSTEM_CONTRACT_ADDR,
        'getAddrDao',
        JSON.stringify({ name: dao_name }),
    )
    return value0
}

export async function deployDao(
    dao_name: string,
    profile_addr: string,
    seed: string,
): Promise<any> {
    return await tonosCli(
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
        }),
    )
}

export async function turnOnDao(
    wallet_addr: string,
    profile_addr: string,
    wallet_pubkey: string,
    seed: string,
): Promise<any> {
    return await tonosCli(
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
