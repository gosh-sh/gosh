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

export type TGoshCommitTag = {
  reponame: string
  name: string
  content: string
  commit: {
    address: string
    name: string
  }
}
