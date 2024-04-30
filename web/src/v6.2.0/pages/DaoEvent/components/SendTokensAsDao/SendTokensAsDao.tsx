import { UserProfile } from '../../../../../blockchain/userprofile'
import { MemberIcon } from '../../../../../components/Dao'
import { Dao } from '../../../../blockchain/dao'
import { EDaoMemberType } from '../../../../types/dao.types'

type TSendTokensAsDaoProps = {
  data: {
    src_dao_name: string
    grant: number
    dst: {
      type: EDaoMemberType
      account: UserProfile | Dao
      name: string
    } | null
  }
}

const SendTokensAsDao = (props: TSendTokensAsDaoProps) => {
  const { data } = props

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          External DAO
        </div>
        <div className="text-sm">{data.src_dao_name}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Amount
        </div>
        <div className="text-sm">{data.grant.toLocaleString()}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Recipient
        </div>
        <div className="text-sm">
          {!data.dst ? (
            'DAO reserve'
          ) : (
            <>
              <MemberIcon
                type={data.dst.type}
                className="mr-2"
                size="sm"
                fixedWidth
              />
              {data.dst.name}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { SendTokensAsDao }
