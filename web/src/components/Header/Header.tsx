import { Disclosure, MenuSeparator } from "@headlessui/react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
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
import classNames from "classnames";
import { Swiper, SwiperSlide } from "swiper/react";
import { Swiper as SwiperClass } from "swiper";
import "swiper/css";
import { useEffect, useRef, useState } from "react";
import { useDao, useDaoMember } from "../../hooks/dao.hooks";
import { getIdenticonAvatar } from "../../helpers";
import { Skeleton } from "@mui/material";
import {
  IconDao,
  IconEthereum,
  IconFiles,
  IconHacksGrants,
  IconMembers,
  IconSettings,
  IconTasks,
} from "./Icons";

export const Header = () => {
  const [tools, setTools] = useState<Array<{ [key: string]: any }>>([]);
  const member = useDaoMember({ initialize: true, subscribe: true });
  const dao = useDao();
  const user = useUser();
  const location = useLocation();
  const setModal = useSetRecoilState(appModalStateAtom);

  const isSignin = location.pathname.search("/signin") >= 0;
  const isSignup = location.pathname.search("/signup") >= 0;
  const isInnerPage = location.pathname.search("/o/") >= 0;

  const swiperRef = useRef<SwiperClass | null>(null);
  const slideMenu = (index: number) => {
    if (swiperRef.current) {
      swiperRef.current.slideTo(index);
    }
  };

  const items = [
    { to: "/a/orgs", title: "Organizations", className: "text-gray-050a15" },
    { to: "/", title: "Hacks & Grants", className: "text-gray-050a15" },
    { to: "/", title: "Tools", className: "text-gray-050a15" },
    {},
    { to: "/a/settings", title: "Settings", className: "text-gray-050a15" },
    { to: "/a/l2", title: "Ethereum", className: "text-gray-050a15" },
  ];

  const getTools = (daoname: string) => {
    const tabs = [
      {
        to: `/o/${daoname}/events`,
        title: "DAO",
        order: 1,
        icon: IconDao,
        color: "#30C054",
      },
      {
        to: `/o/${daoname}/repos`,
        title: "Files",
        order: 2,
        icon: IconFiles,
        color: "#DBB81A",
      },
      {
        to: `/o/${daoname}/members`,
        title: "Members",
        order: 3,
        icon: IconMembers,
        color: "#CBCDD3",
      },
      {
        to: `/o/${daoname}/hacksgrants`,
        title: "H & G",
        order: 4,
        icon: IconHacksGrants,
        color: "#CBCDD3",
      },
      {
        to: `/o/${daoname}/tasks`,
        title: "Tasks",
        order: 5,
        icon: IconTasks,
        color: "#CBCDD3",
      },
    ];

    if (member.isMember) {
      tabs.push({
        to: `/o/${daoname}/settings`,
        title: "Settings",
        order: 7,
        icon: IconSettings,
        color: "#DBB81A",
      });
      tabs.push({
        to: `/o/${daoname}/l2`,
        title: "Ethereum",
        order: 6,
        icon: IconEthereum,
        color: "#5E6974",
      });
    }

    return tabs.sort((a, b) => a.order - b.order);
  };

  useEffect(() => {
    slideMenu(isInnerPage ? 1 : 0);
  }, [isInnerPage]);

  useEffect(() => {
    if (dao.details.name) setTools(getTools(dao.details.name));
  }, [dao]);

  return (
    <header>
      <Disclosure
        as="nav"
        className={classNames(
          "fixed top-0 left-0 flex flex-col items-center justify-between h-full bg-[#f4f4f5] border-r border-[#E7E7F1] transition-all duration-500 ease-[cubic-bezier(0.375, 0.885, 0.6, 1)] z-[2]",
          isInnerPage ? "w-[72px]" : "w-[250px]",
        )}
      >
        {() => (
          <>
            <Link
              to="/"
              className={classNames(
                "h-[80px] grow-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.375, 0.885, 0.6, 1)] border-box self-start relative",
                isInnerPage
                  ? "w-[44px] top-[13px] left-[13px]"
                  : "w-[110px] top-6 left-6",
              )}
            >
              <div className="block h-[44px] w-[110px]">
                <img
                  src={logoBlack}
                  alt="Logo"
                  className="block h-[44px] w-[110px]"
                />
              </div>
            </Link>

            {/* <Swiper 
              autoHeight={true}
              spaceBetween={50}
              slidesPerView={1}
              className="w-full grow pointer-events-none"
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
            >
              <SwiperSlide className="flex flex-col justify-start items-center text-center p-2">
                Slide 1
              </SwiperSlide>
              <SwiperSlide className="flex flex-col justify-start items-center text-center p-2">
                Slide 2
              </SwiperSlide>
            </Swiper> */}
            <div className="flex flex-col justify-start items-center gap-x-4 sm:gap-x-34px grow relative w-full overflow-hidden">
              <div
                className={classNames(
                  "h-auto w-[250px] grow-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.375, 0.885, 0.6, 1)] border-box self-start absolute py-6 px-6",
                  isInnerPage ? "left-[-250px]" : "left-0", // top-6 left-6",
                )}
              >
                {user.persist.phrase &&
                  items.map((item, index) =>
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
              </div>
              <div
                className={classNames(
                  "h-auto w-[72px] grow-0 overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.375, 0.885, 0.6, 1)] border-box absolute py-2 px-2 flex flex-col justify-start items-center",
                  isInnerPage ? "left-0" : "left-[300px]", // top-6 left-6",
                )}
              >
                {/* <NavLink
                  key={"overview"}
                  to={`/o/${dao.details.name}`}
                  className={({ isActive }) =>
                    classNames(
                      "text-[#3D464C] pt-1.5 pb-4 h-[90px]",
                      "border-b-[3px] border-b-transparent whitespace-nowrap",
                      "font-medium tracking-[-0.015rem] text-[15px]",
                      // "hover:text-black hover:border-b-black",
                      // isActive ? "!text-black !border-b-black" : null,
                      // dao.details.name ? "opacity-100" : "opacity-0",
                    )
                  }
                >
                  <div className="w-[48px] h-[48px] border shadow-lg border-none bg-white rounded-lg overflow-hidden">
                    <img
                      src={
                        dao.details.name
                          ? getIdenticonAvatar({
                              seed: dao.details.name,
                            }).toDataUriSync()
                          : undefined
                      }
                      alt=""
                      className={classNames(
                        "w-full transition-all duration-[400ms]",
                        dao.details.name ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                  <div
                    className={classNames(
                      "text-sm w-full text-center text-ellipsis overflow-hidden",
                      "w-full transition-all duration-[400ms]",
                      dao.details.name ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {dao.details.name}
                  </div>
                </NavLink> */}
                {tools.map((item, index) => (
                  <NavLink
                    key={index}
                    to={item.to}
                    end={index === 0}
                    className={({ isActive }) =>
                      classNames(
                        "text-[#3D464C] py-1 font-medium text-[13px] tracking-tight",
                        "whitespace-nowrap text-center",
                        "flex flex-col justify-start items-center",
                        "font-medium tracking-[-0.015rem] text-[15px] mb-2",
                        // "hover:text-black hover:border-b-black",
                        isActive ? "!text-black !border-b-black" : null,
                        isActive ? "!text-black !border-b-black" : null,
                      )
                    }
                  >
                    {({ isActive, isPending, isTransitioning }) => (
                      <>
                        <div
                          className={classNames(
                            "w-[48px] h-[48px] border border-none rounded-lg overflow-hidden text flex flex-col justify-center items-center text-[#CBCDD3] transition-all",
                            isActive ? `shadow-md bg-white` : "",
                          )}
                          style={{
                            color: `text-[${isActive ? item.color : "#CBCDD3"}] !important`,
                          }}
                        >
                          {item.icon}
                        </div>
                        <div
                          className={classNames(
                            "text-[13px] w-full text-center text-ellipsis overflow-hidden",
                            "w-full transition-all duration-[400ms] leading-[19px]",
                            dao.details.name ? "opacity-100" : "opacity-0",
                          )}
                        >
                          {item.title}
                        </div>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
              {/* <div
                className={classNames(
                  "h-[80px] grow-0 overflow-hidden transition-all duration-300  border-box self-start relative",
                  isInnerPage
                    ? "w-[44px]" // top-[14px] left-[14px]"
                    : "w-[110px]", // top-6 left-6",
                )}
              ></div> */}

              {/* Mobile menu button. Simple dropdown menu is used for now */}
              {/* <Disclosure.Button className="btn btn--header btn--burger icon-burger" /> */}

              {/* Menu dropdown (is used as for mobile, as for desktop for now) */}
            </div>
            <div
              className={classNames(
                "flex flex-col justify-center w-full py-4 px-4 grow-0 gap-4",
                isInnerPage ? "items-center" : "items-start", // top-6 left-6",
              )}
            >
              {!user.persist.phrase &&
                ((!isSignin && !isSignup) || isSignup) && (
                  <ButtonLink to={`/a/signin`}>Sign in</ButtonLink>
                )}
              {!user.persist.phrase && isSignin && (
                <ButtonLink to={`/a/signup`}>Sign up</ButtonLink>
              )}{" "}
              {user.persist.phrase && (
                <>
                  <Notifications />
                  <DropdownMenu />
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

export default Header;
