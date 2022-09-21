import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { retry } from '../helpers'
import { userAtom, daoAtom, walletAtom, messageAtom } from '../store'
import {
    GoshDao,
    GoshProfile,
    GoshWallet,
    IGosh,
    IGoshDao,
    IGoshWallet,
} from '../resources/contracts'
import { sleep } from '../utils'
import {
    TDaoCreateProgress,
    TDaoListItem,
    TDaoMemberCreateProgress,
    TDaoMemberListItem,
} from '../types'
import { EGoshError, GoshError } from '../errors'
import { AppConfig } from '../appconfig'
import { useGosh } from './gosh.hooks'
import { useProfile } from './user.hooks'
import { validateDaoName, validateUsername } from '../validators'
import { GoshProfileDao } from '../resources/contracts/goshprofiledao'

const daoMembersDeployHelper = {
    async validateOne(
        gosh: IGosh,
        member: string,
    ): Promise<{ username: string; profile: string }> {
        member = member.trim()
        const { valid, reason } = validateUsername(member)
        if (!valid) throw new GoshError(`${member}: ${reason}`)

        const profile = await gosh.getProfile(member)
        if (!(await profile.isDeployed())) {
            throw new GoshError(`${member}: Profile does not exist`)
        }

        return { username: member, profile: profile.address }
    },
    async validate(
        gosh: IGosh,
        members: string[],
    ): Promise<{ username: string; profile: string }[]> {
        return Promise.all(
            members
                .filter((member) => !!member)
                .map(async (member) => {
                    return await daoMembersDeployHelper.validateOne(gosh, member)
                }),
        )
    },
    async deployOne(
        ownerWallet: IGoshWallet,
        member: { username: string; profile: string },
        setProgressCallback: (member: string, params: object) => void,
    ): Promise<{ profile: string; wallet: string }> {
        // Deploy wallet
        let wallet: IGoshWallet
        let isDeployed: boolean | undefined
        try {
            wallet = await retry(() => ownerWallet.deployDaoWallet(member.profile), 3)
            isDeployed = true
        } catch (e) {
            isDeployed = false
            throw e
        } finally {
            setProgressCallback(member.username, { isDeployed })
        }

        // Mint tokens
        let isMinted: boolean | undefined
        try {
            // TODO: retry
            // const smvTokenBalance = await wallet.getSmvTokenBalance()
            // if (!smvTokenBalance) {
            //     await dao.mint(100, wallet.address, keys)
            // }
            isMinted = true
        } catch (e) {
            isMinted = false
            throw e
        } finally {
            setProgressCallback(member.username, { isMinted })
        }

        return { profile: member.profile, wallet: wallet.address }
    },
    async deploy(
        ownerWallet: IGoshWallet,
        members: { username: string; profile: string }[],
        setProgressCallback: (member: string, params: object) => void,
    ): Promise<{ profile: string; wallet: string }[]> {
        return await Promise.all(
            members.map(async (member) => {
                return await daoMembersDeployHelper.deployOne(
                    ownerWallet,
                    member,
                    setProgressCallback,
                )
            }),
        )
    },
}

function useDaoList(perPage: number) {
    const profile = useProfile()
    const message = useRecoilValue(messageAtom)
    const [search, setSearch] = useState<string>('')
    const [daos, setDaos] = useState<{
        items: TDaoListItem[]
        filtered: { search: string; items: string[] }
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: { search: '', items: [] },
        page: 1,
        isFetching: true,
    })

    /** Load next chunk of DAO list items */
    const onLoadNext = () => {
        setDaos((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TDaoListItem) => {
        if (item.isLoadDetailsFired) return

        setDaos((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const dao = new GoshDao(AppConfig.goshclient, item.address, item.version)
        const details = await dao.getDetails()

        setDaos((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial DAO list */
    useEffect(() => {
        const _getDaoList = async () => {
            if (!profile) return

            // Get IntIn messages to profile and generate DAO address list
            const messages = await profile.getMessages({ msgType: ['IntIn'] }, true, true)
            const daos: { address: string; version: string }[] = messages
                .filter(({ decoded }) => decoded && decoded.name === 'deployedWallet')
                .map(({ decoded }) => ({
                    address: decoded.value.goshdao,
                    version: decoded.value.ver,
                }))

            // TODO: Filter unique DAO addresses and check if DAO address exists
            // Get DAO details (prepare DAO list items)
            const items = await Promise.all(
                Array.from(daos).map(async (item) => {
                    const dao = new GoshDao(
                        AppConfig.goshclient,
                        item.address,
                        item.version,
                    )
                    return {
                        address: dao.address,
                        name: await dao.getName(),
                        version: dao.version,
                    }
                }),
            )
            setDaos((state) => {
                const merged = [...state.items, ...items]
                return {
                    items: merged.sort((a, b) => (a.name > b.name ? 1 : -1)),
                    filtered: { search: '', items: merged.map((item) => item.address) },
                    page: 1,
                    isFetching: false,
                }
            })
        }

        _getDaoList()
    }, [profile?.address])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setDaos((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: {
                    search,
                    items: state.items
                        .filter((item) => _searchItem(search, item.name))
                        .map((item) => item.address),
                },
            }
        })
    }, [search])

    /** Process profile message from subscription */
    useEffect(() => {
        const _updateDaoList = async () => {
            if (!profile || !message) return
            if (message.key !== 'profile') return

            // Decode profile message and check it's type (name)
            const { body, msg_type } = message.message
            const decoded = await profile.decodeMessageBody(body, msg_type)
            if (!decoded || decoded.name !== 'deployedWallet') return

            // Add new dao item to list
            const { goshdao, ver } = decoded.value
            const dao = new GoshDao(AppConfig.goshclient, goshdao, ver)
            const item = {
                address: dao.address,
                name: await dao.getName(),
                version: dao.version,
            }
            setDaos((state) => {
                const merged = [...state.items, item]
                const filtered = {
                    ...state.filtered,
                    items: !_searchItem(state.filtered.search, item.name)
                        ? state.filtered.items
                        : [...state.filtered.items, item.address],
                }
                return {
                    ...state,
                    items: merged.sort((a, b) => (a.name > b.name ? 1 : -1)),
                    filtered,
                }
            })
        }

        _updateDaoList()
    }, [profile, message])

    const _searchItem = (what: string, where: string): boolean => {
        const pattern = new RegExp(`^${what}`, 'i')
        return !what || where.search(pattern) >= 0
    }

    return {
        isFetching: daos.isFetching,
        isEmpty: !daos.isFetching && !daos.filtered.items.length,
        items: daos.items
            .filter((item) => daos.filtered.items.indexOf(item.address) >= 0)
            .slice(0, daos.page * perPage),
        hasNext: daos.page * perPage < daos.filtered.items.length,
        search,
        setSearch,
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
    }
}

function useDao(name?: string) {
    const [details, setDetails] = useRecoilState(daoAtom)
    const profile = useProfile()
    const gosh = useGosh()
    const [dao, setDao] = useState<IGoshDao>()
    const [errors, setErrors] = useState<string[]>([])

    useEffect(() => {
        const _getDao = async () => {
            if (!gosh || !profile || !name) return

            if (!details?.address || details?.name !== name) {
                console.debug('Get dao hook (blockchain)')
                const profileDao = await profile.getProfileDao(name)
                const messages = await profileDao.getMessages(
                    { msgType: ['IntIn'], node: ['src'] },
                    true,
                    true,
                )
                const found = messages.find(({ decoded }) => {
                    return (
                        decoded &&
                        decoded.name === 'deployedDao' &&
                        decoded.value.name === name
                    )
                })
                if (!found) {
                    setErrors((state) => [...state, 'DAO not found'])
                    return
                }

                const dao = new GoshDao(
                    AppConfig.goshclient,
                    found.message.src,
                    found.decoded.value.ver,
                )
                const details = await dao.getDetails()
                setDao(dao)
                setDetails(details)
            } else {
                console.debug('Get dao hook (from state)')
                const { address, version } = details
                const dao = new GoshDao(AppConfig.goshclient, address, version)
                setDao(dao)
            }
        }

        _getDao()
    }, [
        gosh?.version,
        profile?.address,
        name,
        details?.name,
        details?.address,
        setDetails,
    ])

    return {
        instance: dao,
        details,
        errors,
    }
}

function useDaoCreate() {
    const gosh = useGosh()
    const profile = useProfile()
    const [progress, setProgress] = useState<TDaoCreateProgress>({
        isFetching: false,
        members: [],
    })

    const create = async (name: string, members: string[]) => {
        if (!gosh) throw new GoshError(EGoshError.GOSH_UNDEFINED)
        if (!profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (profile.account.signer.type !== 'Keys') {
            throw new GoshError(EGoshError.PROFILE_NO_SIGNER)
        }

        // Validate dao name and members
        const { valid, reason } = validateDaoName(name)
        if (!valid) throw new GoshError(EGoshError.DAO_NAME_INVALID, reason)
        const profiles = await daoMembersDeployHelper.validate(gosh, members)

        // Set inital progress
        setProgress((state) => ({
            ...state,
            isFetching: true,
            members: members.map((member) => ({
                member,
            })),
        }))

        // Deploy dao
        let dao: IGoshDao
        let daoOwnerWallet: IGoshWallet
        let isDaoDeployed: boolean
        try {
            const profileDaoAddr = await profile.getProfileDaoAddr(name)
            const profileDao = new GoshProfileDao(AppConfig.goshclient, profileDaoAddr)
            if (await profileDao.isDeployed()) {
                throw new GoshError(EGoshError.DAO_EXISTS)
            }
            dao = await retry(() => profile.deployDao(gosh, name), 3)

            // Get owner wallet and wait for deploy
            daoOwnerWallet = await dao.getOwnerWallet(profile.account.signer.keys)
            while (true) {
                if (await daoOwnerWallet.isDeployed()) break
                await sleep(5000)
            }

            isDaoDeployed = true
        } catch (e) {
            isDaoDeployed = false
            throw e
        } finally {
            setProgress((state) => ({
                ...state,
                isDaoDeployed,
                members: isDaoDeployed
                    ? state.members
                    : state.members.map((item) => {
                          return { ...item, isDeployed: false, isMinted: false }
                      }),
            }))
        }

        // Deploy members' wallets
        await daoMembersDeployHelper.deploy(daoOwnerWallet, profiles, setProgressCallback)
        setProgress((state) => ({ ...state, isFetching: false }))
    }

    const setProgressCallback = (member: string, params: object): void => {
        setProgress((state) => ({
            ...state,
            members: state.members.map((item) => {
                if (item.member === member) return { ...item, ...params }
                return item
            }),
        }))
    }

    return { progress, create }
}

function useDaoMemberList(perPage: number) {
    const daoDetails = useRecoilValue(daoAtom)
    const [search, setSearch] = useState<string>('')
    const [members, setMembers] = useState<{
        items: TDaoMemberListItem[]
        filtered: string[]
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: [],
        page: 1,
        isFetching: true,
    })

    /** Load next chunk of DAO member list items */
    const onLoadNext = () => {
        setMembers((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TDaoMemberListItem) => {
        if (item.isLoadDetailsFired || !daoDetails) return

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.profile === item.profile) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const wallet = new GoshWallet(
            AppConfig.goshclient,
            item.wallet,
            daoDetails.version,
        )
        const details = {
            smvBalance: await wallet.getSmvTokenBalance(),
        }

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.profile === item.profile) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial DAO members list */
    useEffect(() => {
        const _getMemberList = async () => {
            if (!daoDetails?.address) return

            const items = await Promise.all(
                daoDetails.members.map(async (member) => {
                    const profile = new GoshProfile(AppConfig.goshclient, member.profile)
                    const name = await profile.getName()
                    return { ...member, name }
                }),
            )
            setMembers((state) => ({
                ...state,
                items: items.sort((a, b) => (a.name > b.name ? 1 : -1)),
                filtered: items.map((item) => item.profile),
                isFetching: false,
            }))
        }

        _getMemberList()
    }, [daoDetails?.address, daoDetails?.members.length])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setMembers((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: state.items
                    .filter((item) => {
                        const pattern = new RegExp(search, 'i')
                        return !search || !item.name || item.name.search(pattern) >= 0
                    })
                    .map((item) => item.profile),
            }
        })
    }, [search])

    /** Refresh members details (reset `isLoadDetailsFired` flag) */
    useEffect(() => {
        const interval = setInterval(() => {
            if (members.isFetching) return

            setMembers((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isLoadDetailsFired: false,
                })),
            }))
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [members.isFetching])

    return {
        isFetching: members.isFetching,
        items: members.items
            .filter((item) => members.filtered.indexOf(item.profile) >= 0)
            .slice(0, perPage ? members.page * perPage : members.items.length),
        hasNext: perPage ? members.page * perPage < members.filtered.length : false,
        search,
        setSearch,
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
    }
}

function useDaoMemberCreate(dao: IGoshDao) {
    const { keys } = useRecoilValue(userAtom)
    const setDaoDetails = useSetRecoilState(daoAtom)
    const gosh = useGosh()
    const [progress, setProgress] = useState<TDaoMemberCreateProgress>({
        isFetching: false,
        members: [],
    })

    const create = async (members: string[]) => {
        if (!keys) throw new GoshError(EGoshError.USER_KEYS_UNDEFINED)
        if (!gosh) throw new GoshError(EGoshError.GOSH_UNDEFINED)

        // Validate public keys
        const profiles = await daoMembersDeployHelper.validate(gosh, members)

        // Set initial state
        setProgress((state) => ({
            ...state,
            isFetching: true,
            members: members.map((member) => ({
                member,
            })),
        }))

        // Deploy members
        const ownerWallet = await dao.getOwnerWallet(keys)
        const deployed = await daoMembersDeployHelper.deploy(
            ownerWallet,
            profiles,
            setProgressCallback,
        )

        // Update dao details state
        setDaoDetails((state) => {
            if (!state) return
            return {
                ...state,
                members: [...state.members, ...deployed],
                supply: state.supply + 100 * deployed.length,
            }
        })

        setProgress((state) => ({ ...state, isFetching: false }))
    }

    const setProgressCallback = (member: string, params: object): void => {
        setProgress((state) => ({
            ...state,
            members: state.members.map((item) => {
                if (item.member === member) return { ...item, ...params }
                return item
            }),
        }))
    }

    return { progress, create }
}

function useDaoMemberDelete(dao: IGoshDao) {
    const { keys } = useRecoilValue(userAtom)
    const setDaoDetails = useSetRecoilState(daoAtom)
    const [fetching, setFetching] = useState<string[]>([])

    const isFetching = (pubkey: string) => fetching.indexOf(pubkey) >= 0

    const remove = async (...profiles: string[]) => {
        if (!keys) throw new GoshError(EGoshError.USER_KEYS_UNDEFINED)

        setFetching((state) => [...state, ...profiles])

        const ownerWallet = await dao.getOwnerWallet(keys)
        await Promise.all(
            profiles.map(async (address) => {
                await retry(() => ownerWallet.deleteDaoWallet(address), 3)
                setFetching((state) => state.filter((item) => item !== address))
                setDaoDetails((state) => {
                    if (!state) return
                    return {
                        ...state,
                        members: state.members.filter(
                            ({ profile }) => profile !== address,
                        ),
                        supply: state.supply - 100,
                    }
                })
            }),
        )
    }

    return { remove, isFetching }
}

function useWallet(dao?: IGoshDao) {
    const profile = useProfile()
    const [details, setDetails] = useRecoilState(walletAtom)
    const [wallet, setWallet] = useState<IGoshWallet>()

    useEffect(() => {
        const _getWallet = async () => {
            if (!profile || !dao) return
            if (profile.account.signer.type !== 'Keys') return

            const keys = profile.account.signer.keys
            if (!details?.address || details?.daoAddress !== dao.address) {
                console.debug('Get wallet hook (blockchain)')
                const address = await dao.getWalletAddr(profile.address, 0)
                const instance = new GoshWallet(
                    AppConfig.goshclient,
                    address,
                    dao.version,
                    { keys, profile },
                )
                setWallet(instance)
                setDetails({
                    address: instance.address,
                    version: instance.version,
                    keys,
                    daoAddress: dao.address,
                    isDaoOwner: profile.address === (await dao.getOwner()),
                    isDaoMember: await dao.isMember(profile.address),
                })
            } else {
                console.debug('Get wallet hook (state)')
                const instance = new GoshWallet(
                    AppConfig.goshclient,
                    details.address,
                    dao.version,
                    { keys, profile },
                )
                setWallet(instance)
            }
        }

        _getWallet()
    }, [dao, details?.address, details?.daoAddress, setDetails])

    return { instance: wallet, details }
}

export {
    useDaoList,
    useDao,
    useDaoCreate,
    useDaoMemberList,
    useDaoMemberCreate,
    useDaoMemberDelete,
    useWallet,
}
