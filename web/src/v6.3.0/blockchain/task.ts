import { TonClient } from '@eversdk/core'
import _ from 'lodash'
import { AppConfig } from '../../appconfig'
import { BaseContract } from '../../blockchain/contract'
import { MILESTONE_TASK_TAG, SYSTEM_TAG } from '../../constants'
import { getSystemContract } from '../blockchain/helpers'
import {
  EDaoMemberType,
  TTaskDetails,
  TTaskGrant,
  TTaskGrantPair,
  TTaskGrantTotal,
  TTaskTeamMember,
} from '../types/dao.types'
import TaskABI from './abi/task.abi.json'

export class Task extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, TaskABI, address)
  }

  async getRawDetails() {
    return await this.runLocal('getStatus', {})
  }

  async getDetails() {
    const data = await this.getRawDetails()

    const grant_array: any[] = Object.values(data.grant).map((v) => v)
    const grant_max: any[] = grant_array.sort((a, b) => b.length - a.length)[0]
    const grant: { [key: string]: TTaskGrantPair[] } = {
      assign: [],
      review: [],
      manager: [],
    }
    for (let i = 0; i < grant_max.length; i++) {
      const lock = parseInt(grant_max[i].lock)
      grant.assign.push({
        grant: parseInt(data.grant.assign[i]?.grant || '0'),
        lock,
      })
      grant.review.push({
        grant: parseInt(data.grant.review[i]?.grant || '0'),
        lock,
      })
      grant.manager.push({
        grant: parseInt(data.grant.manager[i]?.grant || '0'),
        lock,
      })
    }

    const grant_total = {
      assign: _.sum(grant.assign.map((item) => item.grant)),
      review: _.sum(grant.review.map((item) => item.grant)),
      manager: _.sum(grant.manager.map((item) => item.grant)),
    }

    let reward: number = _.sum(Object.values(grant_total))

    const tags = data.hashtag.filter((item: string) => {
      return [SYSTEM_TAG, MILESTONE_TASK_TAG].indexOf(item) < 0
    })
    const repository = await getSystemContract().getRepository({ address: data.repo })

    const candidate = data.candidates.length ? data.candidates[0] : null
    let team: TTaskDetails['team'] = null
    if (candidate) {
      // Resolve team users
      const daomembers = Object.keys(candidate.daoMembers)
      const users = await Promise.all(
        ['pubaddrassign', 'pubaddrreview', 'pubaddrmanager'].map(async (key) => {
          return await Promise.all(
            Object.keys(candidate[key]).map(async (profile: string) => {
              const user = { name: '', type: EDaoMemberType.User }
              if (daomembers.indexOf(profile) >= 0) {
                user.name = candidate.daoMembers[profile]
                user.type = EDaoMemberType.Dao
              } else {
                const account = await AppConfig.goshroot.getUserProfile({
                  address: profile,
                })
                user.name = await account.getName()
                user.type = EDaoMemberType.User
              }

              return {
                username: user.name,
                usertype: user.type,
                profile,
              } as TTaskTeamMember
            }),
          )
        }),
      )

      // Get commit data
      let commit_data = null
      if (candidate.commit) {
        let commit = await repository.getCommit({ address: candidate.commit })
        const commitver = await commit.getVersion()
        const repover = await repository.getVersion()
        if (commitver !== repover) {
          const sc = AppConfig.goshroot.getSystemContract(commitver)
          const repo = await sc.getRepository({ address: repository.address })
          commit = await repo.getCommit({ address: commit.address })
        }
        commit_data = await commit.getDetails()
      }

      team = {
        assigners: users[0],
        reviewers: users[1],
        managers: users[2],
        commit: commit_data,
      }
    }

    return {
      milestone_name: data.bigtask,
      name: data.nametask,
      repository: {
        name: await repository.getName(),
        address: repository.address,
      },
      grant: grant as TTaskGrant,
      grantTotal: grant_total as TTaskGrantTotal,
      reward,
      balance: reward,
      vestingEnd: grant_max.slice(-1)[0].lock,
      tagsRaw: data.hashtag,
      tags,
      candidates: data.candidates,
      team,
      locktime: parseInt(data.locktime),
      isReady: data.ready,
      subtasks: [],
    }
  }
}
