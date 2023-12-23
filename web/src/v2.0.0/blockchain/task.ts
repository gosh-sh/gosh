import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import TaskABI from './abi/task.abi.json'
import {
  TTaskDetails,
  TTaskGrant,
  TTaskGrantPair,
  TTaskGrantTotal,
  TTaskTeamMember,
} from '../types/dao.types'
import { SYSTEM_TAG } from '../../constants'
import { getSystemContract } from '../blockchain/helpers'
import _ from 'lodash'
import { AppConfig } from '../../appconfig'

export class Task extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, TaskABI, address)
  }

  async getDetails() {
    const data = await this.runLocal('getStatus', {})

    const grant: { [key: string]: TTaskGrantPair[] } = {}
    const grantTotal: { [key: string]: number } = {}
    let reward: number = 0
    for (const key of ['assign', 'review', 'manager']) {
      grant[key] = data.grant[key].map((item: any) => ({
        grant: parseInt(item.grant),
        lock: parseInt(item.lock),
      }))
      grantTotal[key] = _.sum(grant[key].map((item: any) => item.grant))
      reward += grantTotal[key]
    }

    const tags = data.hashtag.filter((item: string) => item !== SYSTEM_TAG)
    const repository = await getSystemContract().getRepository({ address: data.repo })

    const candidate = data.candidates.length ? data.candidates[0] : null
    let team: TTaskDetails['team'] = null
    if (candidate) {
      // Resolve team users
      const users = await Promise.all(
        ['pubaddrassign', 'pubaddrreview', 'pubaddrmanager'].map(async (key) => {
          return await Promise.all(
            Object.keys(candidate[key]).map(async (profile: string) => {
              const account = await AppConfig.goshroot.getUserProfile({
                address: profile,
              })
              return {
                username: await account.getName(),
                usertype: 'user',
                profile,
              } as TTaskTeamMember
            }),
          )
        }),
      )

      // Get commit data
      const commit = await repository.getCommit({ address: candidate.commit })

      team = {
        assigners: users[0],
        reviewers: users[1],
        managers: users[2],
        commit: await commit.getDetails(),
      }
    }

    return {
      name: data.nametask,
      repository: {
        name: await repository.getName(),
        address: repository.address,
      },
      grant: grant as TTaskGrant,
      grantTotal: grantTotal as TTaskGrantTotal,
      reward,
      vestingEnd: grant.assign.slice(-1)[0].lock,
      tagsRaw: data.hashtag,
      tags,
      candidates: data.candidates,
      team,
      locktime: parseInt(data.locktime),
      isReady: data.ready,
    }
  }
}
