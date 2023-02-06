import { faBlog, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect } from 'react'
import { classNames, shortString } from 'react-gosh'
import { NavLink } from 'react-router-dom'
import ReactTooltip from 'react-tooltip'
import CopyClipboard from '../CopyClipboard'

const SideMenuContainer = (props: React.PropsWithChildren) => {
    const { children } = props

    const goshRoot = process.env.REACT_APP_GOSH_ROOTADDR ?? ''
    const goshNetwork = process.env.REACT_APP_GOSH_NETWORK?.split(',')[0]

    const menu = [
        { to: '/a/orgs', title: 'My organizations' },
        // { to: '/a/repos', title: 'Repositories' },
        { to: '/a/settings', title: 'Settings' },
    ]

    // TODO: May be should be better to reorganize document structure
    useEffect(() => {
        const main = document.getElementById('main')
        main?.classList.add('overflow-hidden')

        return () => {
            main?.classList.remove('overflow-hidden')
        }
    }, [])

    return (
        <div className="container flex flex-nowrap h-full pt-10">
            <div
                className={classNames(
                    'hidden lg:flex flex-col gap-y-3',
                    'min-w-[13rem] pb-10 mr-10',
                    'border-r border-gray-e6edff',
                )}
            >
                {menu.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.to}
                        className={({ isActive }) =>
                            classNames(
                                'block text-gray-7c8db5 font-medium',
                                'py-2 pr-2 border-r-4 border-r-transparent',
                                'hover:text-black hover:border-r-black',
                                isActive ? '!text-black border-r-black' : null,
                            )
                        }
                    >
                        {item.title}
                    </NavLink>
                ))}

                <div className="mt-auto">
                    <a
                        href="https://blog.gosh.sh/"
                        target="_blank"
                        rel="noreferrer"
                        className={classNames(
                            'block text-gray-7c8db5 font-medium',
                            'py-2 pr-2',
                            'hover:text-black',
                        )}
                        // onClick={(e) => {
                        //     if (process.env.REACT_APP_ISDOCKEREXT === 'true') {
                        //         e.preventDefault()
                        //         AppConfig.dockerclient?.host.openExternal(
                        //             'https://blog.gosh.sh/',
                        //         )
                        //     }
                        // }}
                    >
                        <FontAwesomeIcon icon={faBlog} fixedWidth />
                        <span className="ml-3">Our blog</span>
                    </a>

                    <a
                        href="https://t.me/gosh_sh"
                        target="_blank"
                        rel="noreferrer"
                        className={classNames(
                            'block text-gray-7c8db5 font-medium',
                            'py-2 pr-2',
                            'hover:text-black',
                        )}
                        // onClick={(e) => {
                        //     if (process.env.REACT_APP_ISDOCKEREXT === 'true') {
                        //         e.preventDefault()
                        //         AppConfig.dockerclient?.host.openExternal(
                        //             'https://t.me/gosh_sh',
                        //         )
                        //     }
                        // }}
                    >
                        <FontAwesomeIcon icon={faPaperPlane} fixedWidth />
                        <span className="ml-3">Our telegram</span>
                    </a>
                </div>

                <div className="mt-8 text-gray-7c8db5 text-xs">
                    <div className="mb-2">{goshNetwork}</div>
                    <CopyClipboard
                        label={
                            <span data-tip={goshRoot}>{shortString(goshRoot, 6, 4)}</span>
                        }
                        componentProps={{
                            text: goshRoot,
                        }}
                    />
                </div>
            </div>
            <div className="grow pb-10 overflow-hidden overflow-y-auto">{children}</div>
            <ReactTooltip clickable />
        </div>
    )
}

export default SideMenuContainer
