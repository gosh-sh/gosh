import { goshCli } from '../shortcuts.ts'
import { SYSTEM_CONTRACT_ABI } from './abi.ts'
import { SYSTEM_CONTRACT_ADDR } from './client.ts'

export async function deployProfile(name: string, pubkey: string): Promise<void> {
    if (!pubkey.startsWith('0x')) {
        pubkey = `0x${pubkey}`
    }
    try {
        await goshCli(
            'call',
            '--abi',
            SYSTEM_CONTRACT_ABI,
            SYSTEM_CONTRACT_ADDR,
            'deployProfile',
            JSON.stringify({ name, pubkey }),
        )
    } catch (err) {
        // ignore
        // TODO: we should check for network error
        console.debug('Deploy profile error', err)
    }
}

export async function calculateProfileAddr(name: string): Promise<string> {
    const { value0: profile_addr } = await goshCli(
        'run',
        '--abi',
        SYSTEM_CONTRACT_ABI,
        SYSTEM_CONTRACT_ADDR,
        'getProfileAddr',
        JSON.stringify({ name }),
    )
    return profile_addr
}
