import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AppConfig } from '../appconfig'
import { Gosh, IGosh } from '../resources'
import { goshVersionsAtom } from '../store/gosh.state'

function useGoshVersions() {
    const [versions, setVersions] = useRecoilState(goshVersionsAtom)

    const updateVersions = async () => {
        const result = await AppConfig.goshroot.getVersions()
        const loaded = result.map((item: any) => item.Key)
        const cached = versions.all.map((item) => item.version)

        const diff = loaded.filter((v: string) => !cached.includes(v))
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
    const versions = useRecoilValue(goshVersionsAtom)
    const [gosh, setGosh] = useState<IGosh>()

    useEffect(() => {
        const _getGosh = async () => {
            const _version = version || versions.latest
            const _found = versions.all.find((item) => item.version == _version)
            if (!_found) return
            setGosh(new Gosh(AppConfig.goshclient, _found.address, _found.version))
        }

        _getGosh()
    }, [version, versions.latest, versions.all.length])

    return gosh
}

export { useGoshVersions, useGosh }
