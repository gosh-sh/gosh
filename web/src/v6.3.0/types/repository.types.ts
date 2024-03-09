import { TIP3WalletBroxus } from '../../blockchain/tip3wallet-broxus'
import { TTIP3Token } from '../../types/common.types'
import { GoshRepository } from '../blockchain/repository'

export type TGoshRepositoryListItem = {
  account: GoshRepository | null
  name: string
  version: string
  branches: TGoshBranch[]
  description: string
  head: string
  isReady: boolean
}

export type TGoshRepositoryList = {
  isFetching: boolean
  items: TGoshRepositoryListItem[]
  cursor?: string
  hasNext?: boolean
  error?: any
}

export type TGoshBranch = {
  name: string
  commit: {
    address: string
    version: string
  }
}

export type TGoshCommit = {
  repository: string
  branch: string
  name: string
  parents: string[]
  content: string
  initupgrade: boolean
  treeaddr: string
}

export type TGoshTreeItem = {
  name: string
  type: string
  mode: string
  flags: number
  sha1: string
  commit_name: string
  file_tvm_sha256: string | null
  tree_tvm_sha256: string | null
}

export type TGoshSnapshotDetails = {
  base_commit_name: string
  is_ready: boolean
  is_pin: boolean
  temporary: {
    commit_name: string
    compressed: string
    ipfs_id: string
    onchain_content: string | null
    content: string | Buffer | null
    is_binary: boolean
  }
  approved: {
    commit_name: string
    compressed: string
    ipfs_id: string
    onchain_content: string | null
    content: string | Buffer | null
    is_binary: boolean
  }
}

export type TGoshCommitTag = {
  reponame: string
  name: string
  content: string
  commit: {
    address: string
    name: string
  }
  is_hack?: boolean
  branch_name?: string
}

export type TRepoTokenWallet = {
  wallet: TIP3WalletBroxus | null
  token: TTIP3Token
  balance: bigint
}
