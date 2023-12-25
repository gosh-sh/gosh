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
  ResultOfRunTvm,
  signerKeys,
  signerNone,
  TonClient,
} from '@eversdk/core'
import { sleep, retry } from '../utils'
import { GoshError } from '../errors'

class BaseContract {
  private cachedBoc?: string

  client: TonClient
  address: string
  account: Account

  constructor(
    client: TonClient,
    abi: object,
    address: string,
    options?: { keys?: KeyPair },
  ) {
    this.client = client
    this.address = address
    this.account = new Account(
      { abi },
      {
        client,
        address,
        signer: options?.keys ? signerKeys(options.keys) : signerNone(),
      },
    )
  }

  async boc(): Promise<string> {
    if (!this.cachedBoc) {
      this.cachedBoc = await this.account.boc()
    }
    return this.cachedBoc
  }

  async data(): Promise<string> {
    const { result } = await this.account.client.net.query_collection({
      collection: 'accounts',
      filter: { id: { eq: this.address } },
      result: 'data',
    })
    if (!result.length) {
      throw new GoshError('Can not read data for accout', {
        address: this.address,
      })
    }
    return result[0].data
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

  async getVersion(): Promise<string> {
    const { value1 } = await this.runLocal('getVersion', {}, undefined, {
      useCachedBoc: true,
    })
    return value1
  }

  async getTypeVersion(): Promise<{ type: string; version: string }> {
    const { value0, value1 } = await this.runLocal('getVersion', {}, undefined, {
      useCachedBoc: true,
    })
    return { type: value0, version: value1 }
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
  ): Promise<{ cursor?: string; messages: any[]; hasNext?: boolean }> {
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
        const a_lt = parseInt(a.message.created_lt, 16)
        const b_lt = parseInt(b.message.created_lt, 16)
        return b_lt - a_lt
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
      return {
        cursor: pageInfo.startCursor,
        messages,
        hasNext: pageInfo.hasPreviousPage,
      }
    }

    await sleep(50)
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
    settings?: { logging?: boolean; retries?: number },
  ): Promise<ResultOfProcessMessage> {
    const { logging = true, retries = 3 } = settings ?? {}

    if (logging) {
      console.debug('[Run]', { functionName, input })
    }
    const result = await retry(async () => {
      return await this.account.run(functionName, input, options)
    }, retries)
    if (logging) {
      console.debug('[Run result]', { functionName, result })
    }

    return result
  }

  async runLocal(
    functionName: string,
    input: object,
    options?: AccountRunLocalOptions,
    settings?: { logging?: boolean; retries?: number; useCachedBoc?: boolean },
  ): Promise<any> {
    const { logging = true, retries = 2, useCachedBoc = false } = settings ?? {}

    const result = await retry(async () => {
      try {
        if (useCachedBoc) {
          return await this._runLocalCached(functionName, input)
        } else {
          return await this.account.runLocal(functionName, input, options)
        }
      } catch (e: any) {
        if (e.code === 414 && e.data?.exit_code === 60) {
          throw new GoshError('Blockchain error', e.message)
        } else {
          throw e
        }
      }
    }, retries)
    if (logging) console.debug('[RunLocal]', { functionName, input, result })

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

  async decodeMessage(boc: string): Promise<DecodedMessageBody | null> {
    try {
      return await this.account.client.abi.decode_message({
        abi: this.account.abi,
        message: boc,
        allow_partial: true,
      })
    } catch {
      return null
    }
  }

  async decodeAccountData(data?: string) {
    if (!data) {
      data = await this.data()
    }

    const result = await this.account.client.abi.decode_account_data({
      abi: this.account.abi,
      data: data!,
      allow_partial: true,
    })
    return result.data
  }

  private async _runLocalCached(
    functionName: string,
    input: object,
  ): Promise<ResultOfRunTvm> {
    const { message } = await this.account.client.abi.encode_message({
      address: this.address,
      abi: this.account.abi,
      signer: this.account.signer,
      call_set: {
        function_name: functionName,
        input,
      },
    })
    const result = await this.account.client.tvm.run_tvm({
      account: await this.boc(),
      abi: this.account.abi,
      message,
      return_updated_account: true,
    })
    if (result.account) {
      this.cachedBoc = result.account
    }
    return result
  }
}

export { BaseContract }
