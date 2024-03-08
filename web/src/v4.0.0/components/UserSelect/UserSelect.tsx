import AsyncSelect, { AsyncProps } from 'react-select/async'
import { MemberIcon } from '../../../components/Dao'
import { Select2ClassNames } from '../../../helpers'
import { getSystemContract } from '../../blockchain/helpers'
import { EDaoMemberType } from '../../types/dao.types'

type TUserSelectProps = AsyncProps<any, any, any> & {
  searchUser?: boolean
  searchDao?: boolean
}

const UserSelect = (props: TUserSelectProps) => {
  const { searchUser = true, searchDao = false, ...rest } = props

  const getUsernameOptions = async (input: string) => {
    const sc = getSystemContract()
    input = input.toLowerCase()
    const options: any[] = []

    if (searchUser) {
      const query = await sc.getUserProfile({
        username: input,
      })
      if (await query.isDeployed()) {
        options.push({
          label: input,
          value: { name: input, type: EDaoMemberType.User },
        })
      }
    }

    if (searchDao) {
      const query = await sc.getDao({ name: input })
      if (await query.isDeployed()) {
        options.push({
          label: input,
          value: { name: input, type: EDaoMemberType.Dao },
        })
      }
    }

    return options
  }

  return (
    <AsyncSelect
      classNames={Select2ClassNames}
      isClearable
      cacheOptions={false}
      defaultOptions={false}
      loadOptions={getUsernameOptions}
      formatOptionLabel={(data) => {
        return (
          <div>
            <MemberIcon type={data.value.type} size="sm" className="mr-2" />
            {data.label}
          </div>
        )
      }}
      {...rest}
    />
  )
}

export { UserSelect }
