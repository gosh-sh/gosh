import Web3 from 'web3'
import { RegisteredSubscription } from 'web3/lib/commonjs/eth.exports'
import { TIP3Wallet } from '../../blockchain/tip3wallet'

export enum EL2Network {
    ETH = 'eth',
    GOSH = 'gosh',
}

export type TL2TransferStatusItem = {
    type: 'awaiting' | 'pending' | 'completed'
    message: string
}

export type TL2User = {
    label: string
    value: { name: string; address: string; type: string; pubkey: string }
}

export type TL2TransferData = {
    web3: {
        instance: Web3<RegisteredSubscription> | null
        address: string
    }
    gosh: {
        instance: TIP3Wallet | null
        address: string
    }
    comissions: { [route: string]: bigint }
    networks: {
        [key: string]: {
            label: string
            token: string
            balance: bigint
            iconpath: string
            decimals: number
        }
    }
    summary: {
        from: {
            network: string
            user: TL2User | null
            wallet: string
            amount: string
        }
        to: {
            network: string
            user: TL2User | null
            wallet: string
            amount: string
        }
        progress: TL2TransferStatusItem[]
    }
    step: 'route' | 'transfer' | 'complete'
    error?: any
}
