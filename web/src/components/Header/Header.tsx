import React from "react";
import { Disclosure } from "@headlessui/react";
import { Link, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userStatePersistAtom } from "../../store/user.state";
import logoBlack from "../../assets/images/logo-black.svg";
import DropdownMenu from "./DropdownMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-regular-svg-icons";


const Header = () => {
    const userStatePersist = useRecoilValue(userStatePersistAtom);
    const location = useLocation();

    return (
        <header>
            <Disclosure
                as="nav"
                className="container relative flex items-center justify-between h-10 sm:h-12 mt-30px sm:mt-12"
            >
                {() => (
                    <>
                        <Link to="/">
                            <img src={logoBlack} alt="Logo" className="block h-10 sm:h-12 w-auto" />
                        </Link>

                        <div className="flex items-center gap-x-4 sm:gap-x-34px ml-4">
                            <a
                                href="https://t.me/gosh_sh"
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-050a15 sm:text-gray-53596d hover:underline"
                            >
                                <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                                <span className="ml-3 hidden sm:inline">Our telegram</span>
                            </a>
                            {
                                !userStatePersist.phrase &&
                                location.pathname.search(/signin|signup/) < 0 &&
                                location.pathname !== '/'
                                && (
                                    <>
                                        <Link
                                            to={`/account/signup`}
                                            className="btn btn--header icon-arrow"
                                        >
                                            Sign up
                                        </Link>
                                        <Link
                                            to={`/account/signin`}
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
                                        to={`/account/signup`}
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
                                        to={`/account/signin`}
                                        className="btn btn--header icon-arrow"
                                    >
                                        Sign in
                                    </Link>
                                </>
                            )}

                            {/* Mobile menu button. Simple dropdown menu is used for now */}
                            {/* <Disclosure.Button className="btn btn--header btn--burger icon-burger" /> */}

                            {/* Menu dropdown (is used as for mobile, as for desktop for now) */}
                            {userStatePersist.phrase && <DropdownMenu />}
                        </div>

                        <Disclosure.Panel className="sm:hidden">
                            {/* Mobile menu content. Simple dropdown menu is used for now */}
                        </Disclosure.Panel>
                    </>
                )}
            </Disclosure>
        </header>
    );
}

export default Header;
