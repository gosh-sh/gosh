import { tonosCli } from '../shortcuts.ts'
import { GOSH_WALLET_ABI, PROFILE_ABI } from './abi.ts'

type Account = {
    acc_type: 'Active' | string
    address: string
    balance: string
    last_paid: string
    last_trans_lt: string
    'data(boc)': string
    code_hash: string
}

export async function getAccount(addr: string): Promise<Account | null> {
    try {
        const data = await tonosCli('account', addr)
        if (addr in data) {
            return data[addr]
        }
    } catch (err) {
        console.debug('getAccount error', err)
    }
    return null
}

export async function isAccountActive(addr: string): Promise<boolean> {
    const account = await getAccount(addr)
    return account?.acc_type === 'Active'
}

export async function getAccess(wallet_addr: string): Promise<string | null> {
    try {
        const { value0: granted_pubkey } = await tonosCli(
            'run',
            '--abi',
            GOSH_WALLET_ABI,
            wallet_addr,
            'getAccess',
            JSON.stringify({}),
        )
        return granted_pubkey
    } catch (err) {
        console.debug('getAccess error', err)
    }
    return null
}

export async function hasAccess(wallet_addr: string): Promise<boolean> {
    const granted_pubkey = await getAccess(wallet_addr)
    return granted_pubkey === wallet_addr
}
