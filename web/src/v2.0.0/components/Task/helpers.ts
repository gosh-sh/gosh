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
