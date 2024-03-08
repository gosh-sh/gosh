import { TonClient } from '@eversdk/core'
import _ from 'lodash'
import { BaseContract } from '../../blockchain/contract'
import { MILESTONE_TAG } from '../../constants'
import { executeByChunk } from '../../utils'
import {
  EDaoMemberType,
  TMilestoneTaskDetails,
  TTaskDetails,
  TTaskGrant,
  TTaskGrantPair,
  TTaskGrantTotal,
} from '../types/dao.types'
import MilestoneABI from './abi/milestone.abi.json'
import { getSystemContract } from './helpers'

export class Milestone extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, MilestoneABI, address)
  }

  async getRawDetails() {
    return await this.runLocal('getStatus', {})
  }

  async getDetails(daoname: string) {
    const sc = getSystemContract()
    const data = await this.getRawDetails()

    const grant: { [key: string]: TTaskGrantPair[] } = {}
    const grantTotal: { [key: string]: number } = {}
    let reward: number = 0
    for (const key of ['assign', 'review', 'manager', 'subtask']) {
      grant[key] = data.grant[key].map((item: any) => ({
        grant: parseInt(item.grant),
        lock: parseInt(item.lock),
      }))
      grantTotal[key] = _.sum(grant[key].map((item: any) => item.grant))
      reward += grantTotal[key]
    }

    const tags = data.hashtag.filter((item: string) => item !== MILESTONE_TAG)
    const repoaccount = await sc.getRepository({ address: data.repo })
    const reponame = await repoaccount.getName()
    const subtasks = await executeByChunk<string, TMilestoneTaskDetails | null>(
      Object.keys(data.subtask),
      10,
      async (key) => {
        const item = data.subtask[key]
        const task = await sc.getTask({
          data: { daoname, reponame, taskname: item.name },
        })
        if (!(await task.isDeployed())) {
          return null
        }

        const details = await task.getDetails()
        return {
          account: task,
          address: task.address,
          milestone: {
            address: this.address,
            name: data.nametask,
          },
          isMilestone: false,
          isSubtask: true,
          index: parseInt(key),
          ...details,
        }
      },
    )

    const manager = await sc.getUserProfile({
      address: Object.keys(data.candidates[0].pubaddrmanager)[0],
    })
    const team: TTaskDetails['team'] = {
      assigners: [],
      reviewers: [],
      managers: [
        {
          username: await manager.getName(),
          usertype: EDaoMemberType.User,
          profile: manager.address,
        },
      ],
      commit: {
        repository: '',
        branch: '',
        name: '',
        parents: [],
        content: '',
        initupgrade: false,
        treeaddr: '',
      },
    }

    return {
      name: data.nametask,
      repository: {
        name: reponame,
        address: repoaccount.address,
      },
      grant: grant as TTaskGrant,
      grantTotal: grantTotal as TTaskGrantTotal,
      reward,
      balance: reward - grantTotal.manager - parseInt(data.fullSubtaskValue),
      vestingEnd: grant.manager.slice(-1)[0].lock,
      tagsRaw: data.hashtag,
      tags,
      candidates: data.candidates,
      team,
      locktime: parseInt(data.locktime),
      isReady: data.ready,
      subtasks: subtasks.filter((item) => !!item) as TMilestoneTaskDetails[],
    }
  }

  async getSubtaskLastIndex() {
    const data = await this.getRawDetails()
    const keys = Object.keys(data.subtask).map((key) => parseInt(key))
    return Math.max(...keys)
  }
}
