import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { retry } from '../helpers'
import { userAtom, daoAtom } from '../store'
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
    ): Promise<string> {
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

        return wallet.address
    },
    async deploy(
        ownerWallet: IGoshWallet,
        members: { username: string; profile: string }[],
        setProgressCallback: (member: string, params: object) => void,
    ): Promise<string[]> {
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
    const [search, setSearch] = useState<string>('')
    const [daos, setDaos] = useState<{
        items: TDaoListItem[]
        filtered: string[]
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: [],
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
        const getDaoList = async () => {
            if (!profile) return

            // Get IntIn messages to profile and generate DAO address list
            const messages = await profile.getMessages({ msgType: ['IntIn'] }, true, true)
            console.debug('Messages', messages)
            const daos: { address: string; version: string }[] = messages
                .filter((decoded) => decoded.name === 'deployedWallet')
                .map(({ value }) => ({
                    address: value.goshdao,
                    version: value.ver,
                }))
            console.debug('Daos', daos)

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
            setDaos({
                items: items.sort((a, b) => (a.name > b.name ? 1 : -1)),
                filtered: items.map((item) => item.address),
                page: 1,
                isFetching: false,
            })
        }

        getDaoList()
    }, [profile?.address])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setDaos((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: state.items
                    .filter((item) => {
                        const pattern = new RegExp(search, 'i')
                        return !search || item.name.search(pattern) >= 0
                    })
                    .map((item) => item.address),
            }
        })
    }, [search])

    return {
        isFetching: daos.isFetching,
        isEmpty: !daos.isFetching && !daos.filtered.length,
        items: daos.items
            .filter((item) => daos.filtered.indexOf(item.address) >= 0)
            .slice(0, daos.page * perPage),
        hasNext: daos.page * perPage < daos.filtered.length,
        search,
        setSearch,
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
    }
}

function useDao(name?: string) {
    const { keys } = useRecoilValue(userAtom)
    const [details, setDetails] = useRecoilState(daoAtom)
    const profile = useProfile()
    const gosh = useGosh()
    const [dao, setDao] = useState<IGoshDao>()

    useEffect(() => {
        const getDao = async () => {
            if (!gosh || !name) return

            if (!details?.address || details?.name !== name) {
                console.debug('Get dao hook (blockchain)')
                const address = await gosh.getDaoAddr(name)
                console.debug('DAO addr', address)
                // TODO: version
                // const dao = new GoshDao(AppConfig.goshclient, address, '')
                // const details = await dao.getDetails()
                // setDao(dao)
                // setDetails(details)
            } else {
                console.debug('Get dao hook (from state)')
                // TODO: version
                // setDao(new GoshDao(AppConfig.goshclient, details.address, ''))
            }
        }

        getDao()
    }, [gosh?.version, name, details?.name, details?.address, setDetails])

    return {
        instance: dao,
        details,
        isOwner: details && details.owner === profile?.address,
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
                // TODO: Remove this log
                console.debug('Deploy DAO: wait for owner wallet deploy')
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
        if (item.isLoadDetailsFired) return

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.wallet === item.wallet) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        // TODO: version
        const wallet = new GoshWallet(AppConfig.goshclient, item.wallet, '')
        const details = {
            pubkey: await wallet.getPubkey(),
            smvBalance: await wallet.getSmvTokenBalance(),
        }

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.wallet === item.wallet) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial DAO members list */
    useEffect(() => {
        const getMemberList = async () => {
            if (!daoDetails?.address) return

            const items = daoDetails.members.map((address) => ({ wallet: address }))
            setMembers((state) => ({
                ...state,
                items: items.sort((a, b) => (a.wallet > b.wallet ? 1 : -1)),
                filtered: items.map((item) => item.wallet),
                isFetching: false,
            }))
        }

        getMemberList()
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
                        return !search || !item.pubkey || item.pubkey.search(pattern) >= 0
                    })
                    .map((item) => item.wallet),
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
            .filter((item) => members.filtered.indexOf(item.wallet) >= 0)
            .slice(0, perPage ? members.page * perPage : members.items.length),
        hasNext: perPage ? members.page * perPage < members.filtered.length : false,
        search,
        setSearch,
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
    }
}

function useDaoMemberCreate() {
    const { keys } = useRecoilValue(userAtom)
    const [daoDetails, setDaoDetails] = useRecoilState(daoAtom)
    const [progress, setProgress] = useState<TDaoMemberCreateProgress>({
        isFetching: false,
        members: [],
    })

    const createMember = async (members: string[]) => {
        if (!keys) throw new GoshError(EGoshError.USER_KEYS_UNDEFINED)
        if (!daoDetails) throw new GoshError(EGoshError.DAO_UNDEFINED)

        // TODO: version
        const gosh = await AppConfig.goshroot.getGosh('')
        const profileAddr = await gosh.getProfileAddr(`0x${keys.public}`)
        const profile = new GoshProfile(AppConfig.goshclient, profileAddr, keys)

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

        // TODO: version
        const dao = new GoshDao(AppConfig.goshclient, daoDetails.address, '')
        await Promise.all(
            members.map(async (member) => {
                // // Deploy wallet
                // let isDeployed: boolean
                // let wallet: IGoshWallet
                // try {
                //     wallet = await profile.deployWallet(dao.address, profile.address)
                //     await profile.turnOn(wallet.address, member)
                //     isDeployed = true
                // } catch (e) {
                //     isDeployed = false
                //     throw e
                // } finally {
                //     setProgress((state) => ({
                //         ...state,
                //         members: state.members.map((item) => {
                //             if (item.member === member) return { ...item, isDeployed }
                //             return item
                //         }),
                //     }))
                // }
                // // Mint tokens
                // let isMinted: boolean
                // try {
                //     // const smvTokenBalance = await wallet.getSmvTokenBalance()
                //     // if (!smvTokenBalance) {
                //     //     await dao.mint(100, wallet.address, keys)
                //     // }
                //     isMinted = true
                // } catch (e) {
                //     isMinted = false
                //     throw e
                // } finally {
                //     setProgress((state) => ({
                //         ...state,
                //         members: state.members.map((item) => {
                //             if (item.member === member) return { ...item, isMinted }
                //             return item
                //         }),
                //     }))
                // }
                // // Update dao details state
                // setDaoDetails((state) => {
                //     if (!state) return
                //     if (state.members.indexOf(wallet.address) >= 0) return state
                //     return {
                //         ...state,
                //         members: [...state?.members, wallet.address],
                //         supply: state.supply + 100,
                //     }
                // })
            }),
        )

        setProgress((state) => ({ ...state, isFetching: false }))
    }

    return { progress, createMember }
}

function useDaoMemberDelete() {
    const { keys } = useRecoilValue(userAtom)
    const [daoDetails, setDaoDetails] = useRecoilState(daoAtom)
    const [fetching, setFetching] = useState<string[]>([])

    const isFetching = (pubkey: string) => fetching.indexOf(pubkey) >= 0

    const deleteMember = async (...pubkeys: string[]) => {
        if (!keys) throw new GoshError(EGoshError.USER_KEYS_UNDEFINED)
        if (!daoDetails) throw new GoshError(EGoshError.DAO_UNDEFINED)

        setFetching((state) => [...state, ...pubkeys])

        // TODO: version
        const dao = new GoshDao(AppConfig.goshclient, daoDetails.address, '')
        await Promise.all(
            pubkeys.map(async (pubkey) => {
                const walletAddr = await dao.getWalletAddr(pubkey, 0)
                // await dao.deleteWallet(pubkey, keys)
                setFetching((state) => state.filter((_pubkey) => _pubkey !== pubkey))
                setDaoDetails((state) => {
                    if (!state) return
                    return {
                        ...state,
                        members: state.members.filter(
                            (address) => address !== walletAddr,
                        ),
                        supply: state.supply - 100,
                    }
                })
            }),
        )
    }

    return { deleteMember, isFetching }
}

export {
    useDaoList,
    useDao,
    useDaoCreate,
    useDaoMemberList,
    useDaoMemberCreate,
    useDaoMemberDelete,
}
