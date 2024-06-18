import _ from 'lodash'
import { TTaskGrantPair } from '../../types/dao.types'

export const lockToStr = (period: number): string => {
  const months = Math.floor(period / 2592000)
  const seconds = Math.floor(period % 2592000)
  return `${months}mo` + (seconds !== 0 ? ` ${seconds}s` : '')
}

export const isTaskTeamMember = (team: any, profile?: string) => {
  if (!profile) {
    return false
  }

  const isAssigner = team?.assigners.find((item: any) => item.profile === profile)
  const isReviewer = team?.reviewers.find((item: any) => item.profile === profile)
  const isManager = team?.managers.find((item: any) => item.profile === profile)
  return [isAssigner, isReviewer, isManager].some((v) => !!v)
}

export const getGrantMapping = (params: {
  amount: number
  percent: { assign: number; review: number; manager: number }
  lock: number[]
}) => {
  const {
    amount,
    percent: { assign, review, manager },
    lock,
  } = params

  const _grant: {
    [k: string]: {
      percent: number
      int: number
      fraction: number
      list: TTaskGrantPair[]
    }
  } = {
    assign: { percent: assign, int: 0, fraction: 0, list: [] },
    review: { percent: review, int: 0, fraction: 0, list: [] },
    manager: { percent: manager, int: 0, fraction: 0, list: [] },
  }

  // Calculate total rewards for future team
  for (const key of ['assign', 'review', 'manager']) {
    const full = (amount * _grant[key].percent) / 100
    _grant[key].int = Math.trunc(full)
    _grant[key].fraction = full - _grant[key].int
  }
  const grant = Object.fromEntries(
    Object.entries(_grant).sort(([, a], [, b]) => {
      return b.fraction - a.fraction
    }),
  )

  const sumint = _.sum(Object.values(grant).map((item) => item.int))
  let unspreaded = amount - sumint
  for (const item of Object.values(grant)) {
    if (unspreaded === 0) {
      break
    }

    item.int += 1
    unspreaded -= 1
  }

  // Calculate vesting periods for grant list
  for (const key of ['assign', 'review', 'manager']) {
    if (grant[key].int <= 0) {
      continue
    }

    let total = grant[key].int
    for (let i = 0; i < lock.length; i++) {
      const divider = lock.length - i
      const amount = Math.trunc(total / divider)
      grant[key].list.push({ grant: amount, lock: lock[i] })
      total -= amount
    }
  }

  return grant
}
