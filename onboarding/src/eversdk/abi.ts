export const ABI_ROOT = './abi'
export function abi(path: string) {
    return `${ABI_ROOT}/${path}`
}

export const SYSTEM_CONTRACT_ABI = abi('systemcontract.abi.json')
export const GOSH_DAO_ABI = abi('goshdao.abi.json')
export const PROFILE_ABI = abi('profile.abi.json')
