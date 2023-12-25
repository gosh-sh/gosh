import { TUserParam } from 'react-gosh'
import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'
import AsyncSelect, { AsyncProps } from 'react-select/async'

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
      options.push({
        label: input,
        value: { name: input, type: 'dao' },
      })
    }
    return options
  }

  return (
    <AsyncSelect
      className="text-sm"
      cacheOptions={false}
      defaultOptions={false}
      loadOptions={getUsernameOptions}
      formatOptionLabel={(data) => {
        return `${data.label} (${data.value.type})`
      }}
      {...rest}
    />
  )
}

export { UserSelect }
