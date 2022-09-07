import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AppConfig } from '../appconfig'
import { IGosh } from '../resources'
import { goshStateAtom } from '../store/gosh.state'

function useGoshVersions() {
    const [state, setState] = useRecoilState(goshStateAtom)

    const updateVersions = async () => {
        console.debug('Update versions fired')
        const result = await AppConfig.goshroot.getVersions()
        const versions = result.map((item: any) => item.Key)
        setState({
            all: versions,
            latest: versions[versions.length - 1],
        })
    }

    return { versions: state, updateVersions }
}

function useGosh(version?: string) {
    const state = useRecoilValue(goshStateAtom)
    const [gosh, setGosh] = useState<IGosh>()

    useEffect(() => {
        const _getGosh = async () => {
            const _version = version || state.latest
            if (!_version) return

            const instance = await AppConfig.goshroot.getGosh(_version)
            setGosh(instance)
        }

        console.debug('useGosh hook fired')
        _getGosh()
    }, [version, state.latest])

    return gosh
}

export { useGoshVersions, useGosh }
