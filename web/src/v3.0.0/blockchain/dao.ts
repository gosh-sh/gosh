import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import DaoABI from './abi/dao.abi.json'
import { EDaoMemberType, TDaoDetailsMemberItem } from '../types/dao.types'
import { UserProfile } from '../../blockchain/userprofile'
import { DaoWallet } from './daowallet'
import { DaoEvent } from './daoevent'
import { GoshError } from 'react-gosh'
import { getDaoOrProfile } from './helpers'

export class Dao extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, DaoABI, address)
    }

    async isMember(profile: string): Promise<boolean> {
        const { value0 } = await this.runLocal('isMember', { pubaddr: profile })
        return value0
    }

    async isMintOn(): Promise<boolean> {
        const { _allowMint } = await this.runLocal('_allowMint', {})
        return _allowMint
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getNameDao', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    async getDetails() {
        const details = await this.runLocal('getDetails', {})
        const { _isTaskRedeployed } = await this.runLocal('_isTaskRedeployed', {})
        return { ...details, isTaskUpgraded: _isTaskRedeployed }
    }

    async getOwner(): Promise<string> {
        const { value0 } = await this.runLocal('getOwner', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    async getMembers(options: {
        parse?: { wallets: any; daomembers: object }
        isDaoMemberOf?: boolean
    }): Promise<TDaoDetailsMemberItem[]> {
        const { parse, isDaoMemberOf } = options

        const toparse = parse || { wallets: {}, daomembers: {} }
        if (!parse) {
            const details = await this.runLocal('getDetails', {}, undefined, {
                retries: 1,
            })
            toparse.wallets = details.wallets
            toparse.daomembers = details.daoMembers
        }

        const daoaddr = Object.keys(toparse.daomembers).map((key) => {
            return `0:${key.slice(2)}`
        })

        const members = await Promise.all(
            Object.keys(toparse.wallets).map(async (key) => {
                const testaddr = `0:${key.slice(2)}`

                const resolved: { type: EDaoMemberType; account: UserProfile | Dao } = {
                    type: EDaoMemberType.User,
                    account: new UserProfile(this.client, testaddr),
                }
                if (isDaoMemberOf) {
                    const { type, account } = await getDaoOrProfile(testaddr)
                    resolved.type = type
                    resolved.account = account
                } else {
                    resolved.type =
                        daoaddr.indexOf(testaddr) >= 0
                            ? EDaoMemberType.Dao
                            : EDaoMemberType.User
                    resolved.account =
                        resolved.type === EDaoMemberType.Dao
                            ? new Dao(this.client, testaddr)
                            : new UserProfile(this.client, testaddr)
                }
                return {
                    usertype: resolved.type,
                    profile: resolved.account,
                    wallet: new DaoWallet(this.client, toparse.wallets[key].member),
                    allowance: parseInt(toparse.wallets[key].count),
                }
            }),
        )

        return members
    }

    async getMemberWallet(params: {
        address?: string
        keys?: KeyPair
        data?: {
            profile: string
            index?: number
        }
    }) {
        const { address, data, keys } = params

        if (!address && !data) {
            throw new GoshError('Value error', 'Data or address not passed')
        }

        let _address = address
        if (!_address) {
            const { profile, index = 0 } = data!
            const { value0 } = await this.runLocal(
                'getAddrWallet',
                { pubaddr: profile, index },
                undefined,
                { useCachedBoc: true },
            )
            _address = value0
        }

        return new DaoWallet(this.client, _address!, keys)
    }

    async getEventCodeHash(): Promise<string> {
        const { value0 } = await this.runLocal('getProposalCode', {}, undefined, {
            useCachedBoc: true,
        })
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getEvent(params: { address: string }): Promise<DaoEvent> {
        const { address } = params
        return new DaoEvent(this.client, address)
    }

    async getTaskCodeHash(reponame: string): Promise<string> {
        const { value0 } = await this.runLocal(
            'getTaskCode',
            { repoName: reponame },
            undefined,
            {
                useCachedBoc: true,
            },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getPrevious() {
        const { value0 } = await this.runLocal('getPreviousDaoAddr', {}, undefined, {
            useCachedBoc: true,
        })
        return (value0 as string) || null
    }

    async createLimitedWallet(profile: string) {
        await this.run('deployWalletsOutMember', {
            pubmem: [{ member: profile, count: 0 }],
            index: 0,
        })
    }
}
