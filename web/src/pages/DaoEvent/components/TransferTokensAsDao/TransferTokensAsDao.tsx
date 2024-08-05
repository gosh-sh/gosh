type TTransferTokensAsDaoProps = {
  data: {
    src_dao_name: string
    grant: number
    oldversion: string
  }
}

const TransferTokensAsDao = (props: TTransferTokensAsDaoProps) => {
  const { data } = props

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Token of DAO
        </div>
        <div className="text-sm">{data.src_dao_name}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          From version
        </div>
        <div className="text-sm">{data.oldversion}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Amount
        </div>
        <div className="text-sm">{data.grant.toLocaleString()}</div>
      </div>
    </div>
  )
}

export { TransferTokensAsDao }
