import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AppConfig } from '../appconfig'
import { GoshAdapterFactory } from '../gosh'
import { IGoshAdapter } from '../gosh/interfaces'
import { userAtom } from '../store'
import { goshVersionsAtom } from '../store/gosh.state'

function useGoshVersions() {
    const [versions, setVersions] = useRecoilState(goshVersionsAtom)

    const updateVersions = async () => {
        const result = await AppConfig.goshroot.getVersions()
        const loaded = result.map((item: any) => item.Key)
        const cached = versions.all.map((item) => item.version)

        /** Do not filter existing versions due to too much redeploys in development */
        // const diff = loaded.filter((v: string) => !cached.includes(v))
        const diff = loaded
        const added = await Promise.all(
            diff.map(async (version: string) => {
                const address = await AppConfig.goshroot.getGoshAddr(version)
                return { version, address }
            }),
        )

        setVersions((state) => {
            const updated = [...state.all, ...added].sort((a, b) => {
                return a.version > b.version ? 1 : -1
            })
            return {
                ...state,
                all: updated,
                latest: updated[updated.length - 1].version,
                isFetching: false,
            }
        })
    }

    return { versions, updateVersions }
}

function useGosh(version?: string) {
    const { username, keys } = useRecoilValue(userAtom)
    const [gosh, setGosh] = useState<IGoshAdapter>()

    useEffect(() => {
        const _getGosh = async () => {
            const versions = Object.keys(AppConfig.versions)
            const latest = versions[versions.length - 1]
            const _version = version || latest
            setGosh(GoshAdapterFactory.create(_version))
        }

        _getGosh()
    }, [version])

    // useEffect(() => {
    //     const _setAuth = async () => {
    //         if (!gosh) return

    //         console.debug('Gosh set auth', username, keys)
    //         if (!username || !keys) await gosh.authReset()
    //         if (username && keys) await gosh.auth(username, [keys])
    //     }

    //     _setAuth()
    // }, [gosh, username, keys])

    return gosh
}

export { useGoshVersions, useGosh }
