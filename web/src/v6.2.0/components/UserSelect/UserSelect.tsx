import AsyncSelect, { AsyncProps } from 'react-select/async'
import { AppConfig } from '../../../appconfig'
import { MemberIcon } from '../../../components/Dao'
import { Select2ClassNames } from '../../../helpers'
import { getSystemContract } from '../../blockchain/helpers'
import { EDaoMemberType } from '../../types/dao.types'
import { TUserSelectOption } from '../../types/form.types'

type TUserSelectProps = AsyncProps<any, any, any> & {
  searchUser?: boolean
  searchDao?: boolean
  searchDaoGlobal?: boolean // Search for DAO of any version
  searchDaoIsMember?: string // Search for DAO where searchDaoMember (address) is member
}

const UserSelect = (props: TUserSelectProps) => {
  const {
    searchUser = true,
    searchDao = false,
    searchDaoGlobal = false,
    searchDaoIsMember,
    ...rest
  } = props

  const getUsernameOptions = async (input: string) => {
    const sc = getSystemContract()
    input = input.toLowerCase()
    const options: TUserSelectOption[] = []

    if (searchUser) {
      const query = await sc.getUserProfile({ username: input })
      if (await query.isDeployed()) {
        options.push({
          label: input,
          value: {
            name: input,
            address: query.address,
            type: EDaoMemberType.User,
          },
        })
      }
    }

    if (searchDao) {
      const query = await sc.getDao({ name: input })
      const option = {
        label: input,
        value: { name: input, address: query.address, type: EDaoMemberType.Dao },
      }

      if (await query.isDeployed()) {
        if (!searchDaoIsMember) {
          options.push(option)
        } else if (await query.isMember(searchDaoIsMember)) {
          options.push(option)
        }
      }
    }

    if (!searchDao && searchDaoGlobal) {
      const versions = AppConfig.getVersions({ reverse: true })
      const query = await Promise.all(
        Object.keys(versions).map(async (key) => {
          const sc_ver = AppConfig.goshroot.getSystemContract(key)
          const dao_account = await sc_ver.getDao({ name: input })
          return {
            version: key,
            account: dao_account,
            address: dao_account.address,
            deployed: await dao_account.isDeployed(),
          }
        }),
      )

      const found = query.find(({ deployed }) => !!deployed)
      if (found) {
        const { account, address, version } = found
        const option = {
          label: input,
          value: { name: input, address, version, type: EDaoMemberType.Dao },
        }

        if (!searchDaoIsMember) {
          options.push(option)
        } else if (await account.isMember(searchDaoIsMember)) {
          options.push(option)
        }
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
