import React from "react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuSeparator,
  Transition,
} from "@headlessui/react";
import { Link, useLocation } from "react-router-dom";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBlog,
  faChevronDown,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { getIdenticonAvatar } from "../../helpers";
import { useUser } from "../../hooks/user.hooks";
import { onExternalLinkClick } from "../../helpers";

const DropdownMenu = ({ socials }: { socials?: boolean }) => {
  const user = useUser();
  const location = useLocation();
  const isInnerPage = location.pathname.search("/o/") >= 0;
  const items = [
    { to: "/a/orgs", title: "Organizations", className: "text-gray-050a15" },
    // { to: "/a/settings", title: "Settings", className: "text-gray-050a15" },
    // { to: "/a/l2", title: "Ethereum", className: "text-gray-050a15" },
    {
      to: "",
      title: "Sign out",
      className: "text-red-ff3b30",
      onClick: user.signout,
    },
  ];

  return (
    <Menu as="div" className="relative w-full">
      <MenuButton className="flex flex-nowrap flex-col items-center text-gray-53596d gap-0 w-full px-2">
        {({ open }) => (
          <>
            <div className="w-[40px] h-[40px] border shadow-lg border-none bg-white rounded-lg overflow-hidden">
              <img
                src={getIdenticonAvatar({
                  seed: user.persist.profile,
                  radius: 50,
                }).toDataUriSync()}
                alt=""
                className="w-full"
              />
            </div>
            <div className="text-sm w-full text-ellipsis overflow-hidden">
              {user.persist.username}
            </div>
          </>
        )}
      </MenuButton>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className="origin-bottom-left bg-white border left-12 border-gray-e6edff rounded-lg mt-2 z-50 py-2 translate-x-4 -translate-y-2 min-w-[180px]"
          anchor="right end"
        >
          {socials && (
            <>
              <MenuItem
                key={"blog"}
                as={"div"}
                className={"px-4 py-1 text-start"}
              >
                <a
                  href="https://blog.gosh.sh/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-53596d flex flex-row justify-between"
                  onClick={(e) => {
                    onExternalLinkClick(e, "https://blog.gosh.sh/");
                  }}
                >
                  <span className="mr-3 hidden sm:inline">Our Blog</span>
                  <FontAwesomeIcon icon={faBlog} size="lg" />
                </a>
              </MenuItem>
              <MenuItem
                key={"telegram"}
                as={"div"}
                className={"px-4 py-1 text-start"}
              >
                <a
                  href="https://t.me/gosh_sh"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-53596d flex flex-row justify-between"
                  onClick={(e) => {
                    onExternalLinkClick(e, "https://t.me/gosh_sh");
                  }}
                >
                  <span className="mr-3 hidden sm:inline">Our Telegram</span>
                  <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                </a>
              </MenuItem>
              <MenuSeparator className={"h-[1px] bg-[#E7E7F1] my-2"} />
            </>
          )}
          {items.map((item, index) => (
            <MenuItem key={index}>
              {({ active }) => (
                <Link
                  to={item.to}
                  className={classNames(
                    "block py-1 px-4 text-gray-53596d hover:text-black",
                    active ? "text-black" : null,
                    item.className,
                  )}
                  onClick={item.onClick}
                >
                  {item.title}
                </Link>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
};

export default DropdownMenu;
