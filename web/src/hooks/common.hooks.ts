import { useEffect } from 'react'

export function useClickOutside(ref: any, onClickOutside: () => void) {
    useEffect(() => {
        const onClick = ({ target }: any) => {
            if (ref && !ref.contains(target)) {
                onClickOutside()
            }
        }
        document.addEventListener('click', onClick)
        return () => document.removeEventListener('click', onClick)
    }, [])
}
