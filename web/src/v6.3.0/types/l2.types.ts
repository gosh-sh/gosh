import Web3 from 'web3'
import { RegisteredSubscription } from 'web3/lib/commonjs/eth.exports'
import { TIP3Wallet } from '../../blockchain/tip3wallet'

export enum EL2Network {
  ETH = 'eth',
  GOSH = 'gosh',
}

export type TL2TransferStatusItem = {
  type: string
  status: 'disabled' | 'awaiting' | 'pending' | 'completed'
  message: string
  help?: string
}

export type TL2User = {
  label: string
  value: { name: string; address: string; type: string; pubkey: string }
}

export type TL2Token = {
  network: EL2Network
  name: string
  symbol: string
  decimals: number
  iconpath: string
  rootaddr: string | null
  pair_name: string
  pair_with: string[]
}

export type TL2Withdrawal = {
  token: TL2Token
  commission: bigint
  value: bigint
}

export type TL2TransferData = {
  web3: {
    instance: Web3<RegisteredSubscription> | null
    chain_id: string
    chain_supported: boolean
    address: string
    token?: TL2Token | null
    balance: bigint
  }
  gosh: {
    instance: TIP3Wallet | null
    address: string
    token?: TL2Token | null
    balance: bigint
  }
  withdrawals: TL2Withdrawal[]
  comissions: { [route: string]: bigint }
  summary: {
    from: {
      token: TL2Token
      user: TL2User | null
      wallet: string
      amount: string
    }
    to: {
      token: TL2Token
      user: TL2User | null
      wallet: string
      amount: string
    }
    progress: {
      route: string
      steps: TL2TransferStatusItem[]
    }
  }
  step: 'route' | 'transfer' | 'complete'
  error?: any
}
