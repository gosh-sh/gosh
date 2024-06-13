import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'
import AsyncSelect, { AsyncProps } from 'react-select/async'
import { Select2ClassNames } from '../../helpers'
import { UserSelectOption } from './UserSelectOption'

type TUserSelectProps = AsyncProps<any, any, any> & {
  gosh: IGoshAdapter
}

const UserSelect = (props: TUserSelectProps) => {
  const { gosh, ...rest } = props

  const getUsernameOptions = async (input: string) => {
    input = input.toLowerCase()
    const options: any[] = []
    const profileQuery = await gosh.getProfile({ username: input })
    if (await profileQuery.isDeployed()) {
      options.push({
        label: input,
        value: { name: input, type: 'user' },
      })
    }

    const daoQuery = await gosh.getDao({ name: input, useAuth: false })
    if (await daoQuery.isDeployed()) {
      const next = await daoQuery.getNext()
      options.push({
        label: input,
        value: { name: input, type: 'dao' },
        isDisabled: !!next,
        hint: !!next ? (
          <UserSelectOption.IncompatibleHint version={next.version} />
        ) : null,
      })
    }
    return options
  }

  return (
    <AsyncSelect
      classNames={Select2ClassNames}
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
