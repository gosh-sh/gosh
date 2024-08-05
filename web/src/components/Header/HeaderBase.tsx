import { Disclosure, Menu, MenuItems, MenuSeparator } from "@headlessui/react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import logoBlack from "../../assets/images/logo-black.svg";
import DropdownMenu from "./DropdownMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faQuestionCircle,
} from "@fortawesome/free-regular-svg-icons";
import { faDocker } from "@fortawesome/free-brands-svg-icons";
import { faBlog } from "@fortawesome/free-solid-svg-icons";
import { appModalStateAtom } from "../../store/app.state";
import { MDDocumentModal } from "../Modal";
import { useUser } from "../../hooks/user.hooks";
import { AppConfig } from "../../appconfig";
import { ButtonLink } from "../Form";
import { Notifications } from "./Notifications";
import MenuItem from "@mui/material/MenuItem";
import classNames from "classnames";

export const HeaderBase = () => {
  const user = useUser();
  const location = useLocation();
  const setModal = useSetRecoilState(appModalStateAtom);

  const isSignin = location.pathname.search("/signin") >= 0;
  const isSignup = location.pathname.search("/signup") >= 0;

  const items = [
    { to: "/a/orgs", title: "Organizations", className: "text-gray-050a15" },
    { to: "/", title: "Hacks & Grants", className: "text-gray-050a15" },
    { to: "/", title: "Tools", className: "text-gray-050a15" },
    {},
    { to: "/a/settings", title: "Settings", className: "text-gray-050a15" },
    { to: "/a/l2", title: "Ethereum", className: "text-gray-050a15" },
  ];

  return (
    <header>
      <Disclosure
        as="nav"
        className="fixed top-0 left-0 flex flex-col items-stretch justify-stretch h-full w-[250px] bg-[#f4f4f5] border-r border-[#E7E7F1]"
      >
        {() => (
          <>
            <Link
              to="/"
              className="flex items-center justify-start h-auto w-full grow-0 p-6"
            >
              <img
                src={logoBlack}
                alt="Logo"
                className="block h-[44px] w-auto"
              />
            </Link>

            <div className="flex flex-col items-start justify-start gap-x-4 sm:gap-x-34px py-4 px-6 grow">
              {items.map((item, index) =>
                item.to ? (
                  <NavLink
                    to={item.to}
                    className={({ isActive, isPending }) =>
                      classNames(
                        "block py-4 text-gray-53596d font-medium tracking-[-0.02rem] hover:text-black",
                        isActive ? "!text-black" : null,
                        item.className,
                      )
                    }
                  >
                    {item.title}
                  </NavLink>
                ) : (
                  <MenuSeparator
                    className={"h-[1px] bg-[#d6d6dd] my-4 w-full"}
                  />
                ),
              )}

              {AppConfig.dockerclient && (
                <>
                  <Link
                    to="/containers"
                    className="text-gray-53596d hover:underline"
                  >
                    <FontAwesomeIcon icon={faDocker} size="lg" />
                    <span className="ml-3 hidden sm:inline">Containers</span>
                  </Link>

                  <button
                    type="button"
                    className="text-gray-53596d hover:underline"
                    onClick={() => {
                      setModal({
                        static: false,
                        isOpen: true,
                        element: <MDDocumentModal title="Help" path="help" />,
                      });
                    }}
                  >
                    <FontAwesomeIcon icon={faQuestionCircle} size="lg" />
                    <span className="ml-3 hidden sm:inline">Help</span>
                  </button>
                </>
              )}

              {!user.persist.phrase &&
                ((!isSignin && !isSignup) || isSignup) && (
                  <ButtonLink to={`/a/signin`}>Sign in</ButtonLink>
                )}
              {!user.persist.phrase && isSignin && (
                <ButtonLink to={`/a/signup`}>Sign up</ButtonLink>
              )}

              {/* Mobile menu button. Simple dropdown menu is used for now */}
              {/* <Disclosure.Button className="btn btn--header btn--burger icon-burger" /> */}

              {/* Menu dropdown (is used as for mobile, as for desktop for now) */}
            </div>
            <div className="flex flex-col items-start justify-center w-full py-4 px-6 grow-0 gap-4">
              {user.persist.phrase && (
                <>
                  <Notifications />
                  <DropdownMenu socials={false} />
                </>
              )}
            </div>

            <Disclosure.Panel className="sm:hidden">
              {/* Mobile menu content. Simple dropdown menu is used for now */}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </header>
  );
};

export default HeaderBase;
