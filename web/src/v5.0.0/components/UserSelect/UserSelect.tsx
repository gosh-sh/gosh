import AsyncSelect, { AsyncProps } from 'react-select/async'
import { AppConfig } from '../../../appconfig'
import { UserSelectOption } from '../../../components/UserSelect'
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
    input = input.toLowerCase()
    const options: any[] = []

    if (searchUser) {
      const query = await AppConfig.goshroot.getUserProfile({
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
      const query = await getSystemContract().getDao({ name: input })
      if (await query.isDeployed()) {
        const next = await query.getNext()
        options.push({
          label: input,
          value: { name: input, type: EDaoMemberType.Dao },
          isDisabled: !!next,
          hint: !!next ? (
            <UserSelectOption.IncompatibleHint version={next.version} />
          ) : null,
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
      noOptionsMessage={({ inputValue }) => (
        <UserSelectOption.NoOptions input={inputValue} />
      )}
      formatOptionLabel={(data) => <UserSelectOption data={data} />}
      {...rest}
    />
  )
}

export { UserSelect }
