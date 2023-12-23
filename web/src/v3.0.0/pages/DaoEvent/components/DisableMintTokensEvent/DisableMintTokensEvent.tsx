type TDisableMintTokensEventProps = {
  data: any
}

const DisableMintTokensEvent = (props: TDisableMintTokensEventProps) => {
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="text-xs text-gray-53596d">Disable minting DAO tokens forever</div>
        <div className="text-sm">on</div>
      </div>
    </div>
  )
}

export { DisableMintTokensEvent }
