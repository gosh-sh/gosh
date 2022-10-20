import {
    Account,
    AccountRunLocalOptions,
    AccountRunOptions,
    AccountType,
} from '@eversdk/appkit'
import {
    DecodedMessageBody,
    KeyPair,
    ResultOfProcessMessage,
    signerKeys,
    signerNone,
    TonClient,
} from '@eversdk/core'
import { IContract } from './interfaces'
import ABI from '../resources/contracts/abi.json'
import { GoshError } from '../errors'
import { sleep } from '../utils'
import { TAddress } from '../types'

class BaseContract implements IContract {
    address: TAddress
    account: Account
    version: string

    constructor(
        client: TonClient,
        key: string,
        address: TAddress,
        options?: { version?: string; keys?: KeyPair },
    ) {
        const abi = options?.version ? (<any>ABI)[options.version][key] : (<any>ABI)[key]
        if (!abi) throw new GoshError('ABI not found', { key, version: options?.version })

        this.address = address
        this.account = new Account(
            { abi },
            {
                client,
                address,
                signer: options?.keys ? signerKeys(options.keys) : signerNone(),
            },
        )
        this.version = options?.version ?? ''
    }

    async isDeployed(): Promise<boolean> {
        const response = await this.account.client.net.query_collection({
            collection: 'accounts',
            filter: { id: { eq: this.address } },
            result: 'acc_type',
        })

        if (!response.result.length) return false
        return response.result[0].acc_type === AccountType.active
    }

    async getMessages(
        variables: {
            msgType: string[]
            node?: string[]
            cursor?: string | undefined
            limit?: number | undefined
            allow_latest_inconsistent_data?: boolean
        },
        decode?: boolean,
        all?: boolean,
        messages?: any[],
    ): Promise<{ cursor?: string; messages: any[] }> {
        const {
            msgType,
            node = [],
            cursor,
            limit = 50,
            allow_latest_inconsistent_data = false,
        } = variables

        const result = ['id', 'msg_type', 'created_lt', 'body', ...node]
        messages = messages ?? []
        all = all ?? false
        decode = decode ?? false

        const query = `query MessagesQuery(
            $address: String!,
            $msgType: [BlockchainMessageTypeFilterEnum!],
            $cursor: String,
            $limit: Int
            $allow_latest_inconsistent_data: Boolean
        ) {
            blockchain {
                account(address: $address) {
                    messages(
                        msg_type: $msgType,
                        last: $limit,
                        before: $cursor,
                        allow_latest_inconsistent_data: $allow_latest_inconsistent_data
                    ) {
                        edges {
                            node {${result.join(' ')}}
                        }
                        pageInfo {
                            startCursor
                            hasPreviousPage
                        }
                    }
                }
            }
        }`
        const response = await this.account.client.net.query({
            query,
            variables: {
                address: this.address,
                msgType,
                limit,
                cursor: cursor || null,
                allow_latest_inconsistent_data,
            },
        })
        const { edges, pageInfo } = response.result.data.blockchain.account.messages

        const page = edges
            .map((edge: any) => ({ message: edge.node, decoded: null }))
            .sort((a: any, b: any) => {
                const a_lt = parseInt(a.created_lt, 16)
                const b_lt = parseInt(b.created_lt, 16)
                return a_lt < b_lt ? 1 : -1
            })
        if (decode) {
            await Promise.all(
                page.map(async (item: any) => {
                    const { body, msg_type } = item.message
                    item.decoded = await this.decodeMessageBody(body, msg_type)
                }),
            )
        }
        messages.push(...page)

        if (!all || !pageInfo.hasPreviousPage) {
            return { cursor: pageInfo.startCursor, messages }
        }

        await sleep(300)
        return await this.getMessages(
            { ...variables, cursor: pageInfo.startCursor },
            decode,
            all,
            messages,
        )
    }

    async run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        writeLog: boolean = true,
    ): Promise<ResultOfProcessMessage> {
        if (writeLog) console.debug('[Run]', { functionName, input, options })
        const result = await this.account.run(functionName, input, options)
        if (writeLog) console.debug('[Run result]', { functionName, result })
        return result
    }

    async runLocal(
        functionName: string,
        input: object,
        options?: AccountRunLocalOptions,
        writeLog: boolean = true,
    ): Promise<any> {
        const result = await this.account.runLocal(functionName, input, options)
        if (writeLog) console.debug('[RunLocal]', { functionName, input, result })
        return result.decoded?.output
    }

    async decodeMessageBody(
        body: string,
        type: number,
    ): Promise<DecodedMessageBody | null> {
        try {
            return await this.account.client.abi.decode_message_body({
                abi: this.account.abi,
                body,
                is_internal: type === 0,
                allow_partial: true,
            })
        } catch {
            return null
        }
    }
}

export { BaseContract }
