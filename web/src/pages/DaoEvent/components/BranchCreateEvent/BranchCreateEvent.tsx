type TBranchCreateEventProps = {
  data: { newName: string; repoName: string }
}

const BranchCreateEvent = (props: TBranchCreateEventProps) => {
  const { data } = props

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Repository
        </div>
        <div className="text-sm">{data.repoName}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Branch</div>
        <div className="text-sm">{data.newName}</div>
      </div>
    </div>
  )
}

export { BranchCreateEvent }
