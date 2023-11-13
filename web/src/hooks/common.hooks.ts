import mobile from 'is-mobile'
import { RefObject, useEffect } from 'react'
import { clearBodyLocks, lock } from 'tua-body-scroll-lock'

export function useClickOutside(ref: RefObject<any>, onClickOutside: () => void) {
    useEffect(() => {
        const onClick = ({ target }: any) => {
            if (ref && !ref.current?.contains(target)) {
                onClickOutside()
            }
        }
        document.addEventListener('click', onClick)
        return () => document.removeEventListener('click', onClick)
    }, [])
}

export function useBodyScrollLock(params: {
    applyWhen: boolean
    deps?: any[]
    mobileOnly?: boolean
}) {
    const { applyWhen, deps, mobileOnly } = params

    useEffect(() => {
        const scrollables = document.querySelector('.body-scroll-lock')
        if (applyWhen && (!mobileOnly || (mobileOnly && mobile()))) {
            lock(scrollables as any)
        }

        return () => {
            clearBodyLocks()
        }
    }, deps || [])
}
