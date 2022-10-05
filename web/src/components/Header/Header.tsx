import { Disclosure } from '@headlessui/react'
import { Link, useLocation } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import logoBlack from '../../assets/images/logo-black.svg'
import DropdownMenu from './DropdownMenu'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { faDocker } from '@fortawesome/free-brands-svg-icons'
import { appModalStateAtom } from '../../store/app.state'
import MDDocumentModal from '../Modal/MDDocument/MDDocumentModal'
import { AppConfig, useUser } from 'react-gosh'

const Header = () => {
    const user = useUser()
    const location = useLocation()
    const setModal = useSetRecoilState(appModalStateAtom)

    return (
        <header>
            <Disclosure
                as="nav"
                className="container relative flex items-center justify-between h-10 sm:h-12 mt-30px sm:mt-12"
            >
                {() => (
                    <>
                        <Link to="/">
                            <img
                                src={logoBlack}
                                alt="Logo"
                                className="block h-10 sm:h-12 w-auto"
                            />
                        </Link>

                        <div className="flex items-center gap-x-4 sm:gap-x-34px ml-4">
                            {process.env.REACT_APP_ISDOCKEREXT === 'true' && (
                                <>
                                    <Link
                                        to="/containers"
                                        className="text-gray-050a15 sm:text-gray-53596d hover:underline"
                                    >
                                        <FontAwesomeIcon icon={faDocker} size="lg" />
                                        <span className="ml-3 hidden sm:inline">
                                            Containers
                                        </span>
                                    </Link>

                                    <button
                                        type="button"
                                        className="text-gray-050a15 sm:text-gray-53596d hover:underline"
                                        onClick={() => {
                                            setModal({
                                                static: false,
                                                isOpen: true,
                                                element: (
                                                    <MDDocumentModal
                                                        title="Help"
                                                        path="help"
                                                    />
                                                ),
                                            })
                                        }}
                                    >
                                        <FontAwesomeIcon
                                            icon={faQuestionCircle}
                                            size="lg"
                                        />
                                        <span className="ml-3 hidden sm:inline">
                                            Help
                                        </span>
                                    </button>
                                </>
                            )}

                            <a
                                href="https://t.me/gosh_sh"
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-050a15 sm:text-gray-53596d hover:underline"
                                onClick={(e) => {
                                    if (process.env.REACT_APP_ISDOCKEREXT === 'true') {
                                        e.preventDefault()
                                        AppConfig.dockerclient?.host.openExternal(
                                            'https://t.me/gosh_sh',
                                        )
                                    }
                                }}
                            >
                                <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                                <span className="ml-3 hidden sm:inline">
                                    Our telegram
                                </span>
                            </a>

                            {!user.persist.phrase &&
                                location.pathname.search(/signin|signup/) < 0 &&
                                location.pathname !== '/' && (
                                    <>
                                        <Link
                                            to={`/a/signup`}
                                            className="btn btn--header icon-arrow"
                                        >
                                            Sign up
                                        </Link>
                                        <Link
                                            to={`/a/signin`}
                                            className="btn btn--header icon-arrow"
                                        >
                                            Sign in
                                        </Link>
                                    </>
                                )}
                            {location.pathname.search('/signin') >= 0 && (
                                <>
                                    {/* <div className="text-lg text-gray-53596d hidden sm:block">
                                        Don't have an account?
                                    </div> */}
                                    <Link
                                        to={`/a/signup`}
                                        className="btn btn--header icon-arrow"
                                    >
                                        Sign up
                                    </Link>
                                </>
                            )}
                            {location.pathname.search('/signup') >= 0 && (
                                <>
                                    {/* <div className="text-lg text-gray-53596d hidden sm:block">
                                        Already have an account?
                                    </div> */}
                                    <Link
                                        to={`/a/signin`}
                                        className="btn btn--header icon-arrow"
                                    >
                                        Sign in
                                    </Link>
                                </>
                            )}

                            {/* Mobile menu button. Simple dropdown menu is used for now */}
                            {/* <Disclosure.Button className="btn btn--header btn--burger icon-burger" /> */}

                            {/* Menu dropdown (is used as for mobile, as for desktop for now) */}
                            {user.persist.phrase && <DropdownMenu />}
                        </div>

                        <Disclosure.Panel className="sm:hidden">
                            {/* Mobile menu content. Simple dropdown menu is used for now */}
                        </Disclosure.Panel>
                    </>
                )}
            </Disclosure>
        </header>
    )
}

export default Header
