import AsyncSelect, { AsyncProps } from 'react-select/async'
import { AppConfig } from '../../../appconfig'
import { MemberIcon } from '../../../components/Dao'
import { Select2ClassNames } from '../../../helpers'
import { getSystemContract } from '../../blockchain/helpers'
import { EDaoMemberType } from '../../types/dao.types'

type TUserSelectProps = AsyncProps<any, any, any> & {
    searchUser?: boolean
    searchDao?: boolean
    searchDaoGlobal?: boolean // Search for DAO of any version
}

const UserSelect = (props: TUserSelectProps) => {
    const {
        searchUser = true,
        searchDao = false,
        searchDaoGlobal = false,
        ...rest
    } = props

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
                    value: {
                        name: input,
                        address: query.address,
                        type: EDaoMemberType.User,
                    },
                })
            }
        }

        if (searchDao) {
            const query = await getSystemContract().getDao({ name: input })
            if (await query.isDeployed()) {
                options.push({
                    label: input,
                    value: {
                        name: input,
                        address: query.address,
                        type: EDaoMemberType.Dao,
                    },
                })
            }
        }

        if (!searchDao && searchDaoGlobal) {
            const versions = AppConfig.getVersions({ reverse: true })
            const query = await Promise.all(
                Object.keys(versions).map(async (key) => {
                    const sc = AppConfig.goshroot.getSystemContract(key)
                    const dao_account = await sc.getDao({ name: input })
                    return {
                        version: key,
                        address: dao_account.address,
                        deployed: await dao_account.isDeployed(),
                    }
                }),
            )
            const found = query.filter(({ deployed }) => !!deployed)
            if (found.length > 0) {
                options.push({
                    label: input,
                    value: {
                        name: input,
                        address: found[0].address,
                        version: found[0].version,
                        type: EDaoMemberType.Dao,
                    },
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
