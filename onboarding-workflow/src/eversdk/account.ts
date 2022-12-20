import { tonosCli } from '../shortcuts.ts'

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

export async function isAccountActive(addr: string) {
    const account = await getAccount(addr)
    return account?.acc_type === 'Active'
}
