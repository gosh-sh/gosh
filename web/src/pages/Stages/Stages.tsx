import { faFile, faHandPaper } from "@fortawesome/free-regular-svg-icons";
import {
  faGripLines,
  faLock,
  faLockOpen,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import {
  faChevronDown,
  faClockRotateLeft,
  faCode,
  faCodeBranch,
  faInfoCircle,
  faFolder,
  faMagnifyingGlass,
  faRightLong,
  faTerminal,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Menu,
  MenuButton,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import React, { useEffect, useState } from "react";
import {
  AppConfig,
  classNames,
  shortString,
  splitByPath,
  TBranch,
  useBranches,
  useBranchManagement,
  useTree,
} from "react-gosh";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { BranchOperateProgress, BranchSelect } from "../../components/Branches";
import CopyClipboard from "../../components/CopyClipboard";
import { Button, ButtonLink } from "../../components/Form";
import Loader from "../../components/Loader";
import { onExternalLinkClick } from "../../helpers";
import { TRepoLayoutOutletContext } from "../../pages/StagesLayout";
import RepoReadme from "./Readme";
import { Filetype } from "../BlobCreate";
import { AnimatePresence, motion } from "framer-motion";
import StageCreate from "../../components/Modal/StageCreate/StageCreate";
import CommitProgress from "../../components/Commit/CommitProgress";
import { toast } from "react-toastify";
import { ToastError } from "../../components/Toast";
import { useUpdateBranchConfig } from "../../hooks/repository.hooks";
import { Form, Formik } from "formik";
import yup from "../../yup-extended";

const StagesPage = () => {
  const treepath = useParams()["*"] || "";
  const { daoName, repoName, branchName } = useParams();
  const navigate = useNavigate();
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>();
  const { branches, branch, updateBranch, updateBranches } = useBranches(
    repository.adapter,
    branchName,
  );
  const { subtree, blobs } = useTree(
    daoName!,
    repoName!,
    branch?.commit,
    treepath,
  );

  const [dirUp] = splitByPath(treepath);

  const getRemoteUrl = (short: boolean): string => {
    const goshAddress = AppConfig.versions[repository.details.version];
    const goshstr = short ? shortString(goshAddress) : goshAddress;
    return `gosh://${goshstr}/${daoName}/${repoName}`;
  };

  const editors = [
    { to: `code`, title: "Code", subtitle: "", className: "text-gray-050a15" },
    {
      to: Filetype.MARKDOWN,
      title: "Markdown",
      subtitle: `.${Filetype.MARKDOWN}`,
      className: "text-gray-050a15",
    },
    {
      to: Filetype.DOCUMENT,
      title: "Rich Text",
      subtitle: `.${Filetype.DOCUMENT}`,
      className: "text-gray-050a15",
    },
  ];

  useEffect(() => {
    if (!branchName) {
      navigate(`/o/${daoName}/r/${repoName}/tree/${repository.details.head}`);
    } else {
      updateBranch(branchName);
    }
  }, [
    daoName,
    repoName,
    branchName,
    repository.details.head,
    navigate,
    updateBranch,
  ]);

  // const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
  // const navigate = useNavigate()
  // const [branchName, setBranchName] = useState<string>('main')
  // const { branches, branch, updateBranches } = useBranches(repository.adapter, branchName)
  const {
    create: createBranch,
    destroy: deleteBranch,
    lock: lockBranch,
    unlock: unlockBranch,
    sethead: setheadBranch,
    progress: branchProgress,
    pushProgress,
  } = useBranchManagement(dao.details, repository.adapter);
  const { addProtection, removeProtection, updateOrder, status } =
    useUpdateBranchConfig();
  const [search, setSearch] = useState<string>("");
  const [filtered, setFiltered] = useState<TBranch[]>(branches);

  const onBranchLock = async (name: string) => {
    try {
      const { eventaddr } = await lockBranch(name);
      navigate(`/o/${daoName}/events/${eventaddr || ""}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(<ToastError error={e} />);
    }
  };

  const onBranchUnlock = async (name: string) => {
    try {
      const { eventaddr } = await unlockBranch(name);
      navigate(`/o/${daoName}/events/${eventaddr || ""}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(<ToastError error={e} />);
    }
  };

  const onStageLock = async (name: string) => {
    if (window.confirm(`Delete branch '${name}'?`)) {
      try {
        await deleteBranch(name);
      } catch (e: any) {
        console.error(e);
        toast.error(<ToastError error={e} />);
      }
    }
  };

  const onBranchSetHead = async (name: string) => {
    try {
      await setheadBranch(name);
    } catch (e: any) {
      console.error(e);
      toast.error(<ToastError error={e} />);
    }
  };

  useEffect(() => {
    updateBranches();
  }, [updateBranches]);

  useEffect(() => {
    if (search) {
      const pattern = new RegExp(search, "i");
      setFiltered(branches.filter((item) => item.name.search(pattern) >= 0));
    } else {
      setFiltered(branches);
    }
  }, [branches, search]);

  return (
    <div className="grow flex flex-row flex-wrap lg:flex-nowrap min-h-full">
      <div className="grow container basis-1 py-4 border-[#d6d9e1] border-[#E7E7F1] border-0 min-h-full border-r-[1px]">
        <div className=" flex flex-row justify-between align-middle">
          <h3 className="font-semibold grow text-xl font">
            Stages{" "}
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="text-[#CBCDD3] text-sm ml-1 relative top-[-1px] cursor-pointer"
            />
          </h3>

          <AnimatePresence mode="wait">
            <Popover as="div" className="md:relative">
              <PopoverButton
                as={Button}
                test-id="btn-add-stage"
                variant="secondary"
                className="outline-none"
              >
                <FontAwesomeIcon
                  icon={faPlus}
                  className="w-[16px] h-[16px] align-[-0.25rem] opacity-30 align-middle"
                />
                <span className="hidden sm:inline-block ml-2">New stage</span>
              </PopoverButton>
              <Popover.Overlay className="fixed inset-0 bg-[#5e656c] opacity-20 z-[2]" />
              <Popover.Panel
                as={motion.div}
                className="absolute origin-top-right right-[0px] top-[42px] mt-2 z-10 w-[50vw] max-w-[400px] px-5 md:px-0"
                initial={{ opacity: 0, translateY: "-0.25rem" }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: "0.25rem" }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-xl shadow-sm shadow-[#7c8db5]/5 border border-gray-e6edff bg-white p-4">
                  <StageCreate />
                </div>
              </Popover.Panel>
            </Popover>
          </AnimatePresence>
        </div>
        <div>
          <div
            className={classNames("text-xs text-gray-7c8db5 hidden lg:flex")}
          >
            <div className={"basis.name"}>Name</div>
            <div className={"basis.expert_tags"}>Rules</div>
            <div className={"basis.allowance"}>Access tags</div>
          </div>
        </div>

        {branchProgress.isFetching && branchProgress.type === "create" && (
          <div className="mt-4">
            {!pushProgress.completed ? (
              <CommitProgress {...pushProgress} />
            ) : (
              <BranchOperateProgress
                operation="Deploy"
                progress={branchProgress.details}
              />
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {filtered.map((branch, index) => (
            <div
              key={index}
              draggable="true"
              className="flex flex-wrap gap-x-4 gap-y-2 z-0 items-center px-4 py-3 bg-white чtext-sm rounded-lg border-solid border-[#d6d9e1] border-0 border-[1px] active:rounded-lg"
              style={{ transform: "translate(0, 0)" }}
            >
              <div className="grow flex flex-row items-center gap-3">
                <FontAwesomeIcon
                  className="mr-1 opacity-[0.2]"
                  size="lg"
                  icon={faGripLines}
                />
                <Link
                  to={`/o/${daoName}/r/${repoName}/tree/${branch.name}`}
                  className="hover:underline mr-2 text-[16px] font-semibold"
                >
                  {((branch.priority || 0) + 1)?.toLocaleString("en-US", {
                    minimumIntegerDigits: 2,
                    useGrouping: false,
                  })}{" "}
                  · {branch.name}
                </Link>

                {branch.isProtected && (
                  <div className="inline-block rounded-2xl bg-amber-400 text-xs text-white px-2 py-1 mr-2">
                    <FontAwesomeIcon className="mr-1" size="sm" icon={faLock} />
                  </div>
                )}

                {/* {repository.details.head === branch.name && (
                <div className="inline-block rounded-2xl bg-amber-400 text-xs text-white px-2 py-1 mr-2">
                  <FontAwesomeIcon className="mr-1" size="sm" icon={faCodeBranch} />
                  Head
                </div>
              )} */}
              </div>
              <div className="grow-0">
                {dao.details.isAuthMember && (
                  <div className="flex gap-x-3">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="lg"
                      onClick={() => {
                        branch.isProtected
                          ? onBranchUnlock(branch.name)
                          : onBranchLock(branch.name);
                      }}
                      disabled={branchProgress.isFetching}
                      isLoading={
                        branchProgress.isFetching &&
                        branchProgress.type === "(un)lock" &&
                        branchProgress.name === branch.name
                      }
                      className="border-none !px-2 !w-[40px] !h-[40px]"
                    >
                      {branch.isProtected ? (
                        <FontAwesomeIcon
                          className="mr-1 opacity-[1]"
                          size="lg"
                          icon={faLock}
                        />
                      ) : (
                        <FontAwesomeIcon
                          className="mr-1 opacity-[0.2]"
                          size="lg"
                          icon={faLockOpen}
                        />
                      )}
                    </Button>

                    <AnimatePresence mode="wait">
                      <Popover as="div" className="md:relative">
                        <PopoverButton
                          as={Button}
                          test-id="btn-add-stage"
                          variant="outline-secondary"
                          className="outline-none border-none !px-2 !w-[40px] !h-[40px]"
                        >
                          <FontAwesomeIcon
                            className="mr-1 opacity-[0.2]"
                            size="xl"
                            icon={faHandPaper}
                          />
                        </PopoverButton>
                        <PopoverPanel
                          as={motion.div}
                          className="absolute origin-top-right right-[0px] top-[42px] mt-2 w-[50vw] max-w-[400px] px-5 md:px-0"
                          initial={{ opacity: 0, translateY: "-0.25rem" }}
                          animate={{ opacity: 1, translateY: 0 }}
                          exit={{ opacity: 0, translateY: "0.25rem" }}
                          transition={{ duration: 0.2 }}
                        >
                          <Formik
                            initialValues={{ newName: "", from: branch }}
                            onSubmit={() => {}}
                            validationSchema={yup.object().shape({
                              newName: yup
                                .string()
                                .matches(
                                  /^[\w-]+$/,
                                  "Name has invalid characters",
                                )
                                .max(64, "Max length is 64 characters")
                                .notOneOf(
                                  branches.map((b) => b.name),
                                  "Stage exists",
                                )
                                .required("Stage name is required"),
                            })}
                          >
                            {({ isSubmitting, setFieldValue }) => (
                              <Form className="flex flex-col items-end justify-end gap-4">
                                <div className="rounded-xl shadow-sm shadow-[#7c8db5]/5 border border-gray-e6edff bg-white p-4  z-[10000]">
                                  {dao.details.tags?.map((tag, index) => (
                                    <span
                                      key={index}
                                      className={classNames(
                                        "border border-gray-e6edff rounded px-2",
                                        "text-xs text-gray-7c8db5",
                                      )}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </Form>
                            )}
                          </Formik>
                        </PopoverPanel>
                      </Popover>
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="grow flex flex-row items-center gap-3">
                {[].map((tag) => (
                  <></>
                ))}
              </div>

              {branchProgress.isFetching &&
                branchProgress.type === "destroy" &&
                branchProgress.name === branch.name && (
                  <div className="basis-full">
                    <BranchOperateProgress
                      operation="Delete"
                      progress={branchProgress.details}
                    />
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      <div className="grow basis-1 container py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 mb-4">
          {/* <div className="grow flex items-center gap-y-2 gap-x-5">
						<BranchSelect
							branch={branch}
							branches={branches}
							onChange={(selected) => {
								if (selected) {
									navigate(`/o/${daoName}/r/${repoName}/tree/${selected.name}`);
								}
							}}
						/>

						<Link
							to={`/o/${daoName}/r/${repoName}/branches`}
							className="block text-sm text-gray-53596d hover:text-black"
						>
							<span className="font-semibold">
								<FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
								{branches.length}
							</span>
							<span className="hidden sm:inline-block ml-1">branches</span>
						</Link>

						<Link
							to={`/o/${daoName}/r/${repoName}/commits/${branch?.name}`}
							className="block text-sm text-gray-53596d hover:text-black"
						>
							<FontAwesomeIcon icon={faClockRotateLeft} />
							<span className="hidden sm:inline-block ml-1">History</span>
						</Link>
					</div> */}

          <div className="flex grow gap-3 justify-end">
            {/* <ButtonLink
							to={`/o/${daoName}/r/${repoName}/find/${branch?.name}`}
							test-id="link-goto-file"
						>
							<FontAwesomeIcon icon={faMagnifyingGlass} />
							<span className="hidden sm:inline-block ml-2">Go to file</span>
						</ButtonLink> */}
            {/* {!branch?.isProtected && dao.details.isAuthMember && (
              <ButtonLink
                to={`/o/${daoName}/r/${repoName}/blobs/create/${branch?.name}${
                  treepath && `/${treepath}`
                }`}
                test-id="link-file-create"
              >
                <FontAwesomeIcon icon={faFileCirclePlus} />
                <span className="hidden sm:inline-block ml-2">Add file</span>
              </ButtonLink>
            )} */}
            {!branch?.isProtected && dao.details.isAuthMember && (
              <Menu as="div" className="relative">
                <MenuButton test-id="btn-clone-trigger" as={Button}>
                  {/* <Button test-id="btn-clone-trigger"> */}
                  <span className="hidden sm:inline-block ml-1">Add file</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    size="sm"
                    className="ml-2 opacity-50"
                  />
                  {/* </Button> */}
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
                  <Menu.Items className="absolute origin-top-right right-0 bg-white border border-gray-e6edff min-w-full rounded-lg mt-2 z-50 py-2">
                    {editors.map((item, index) => (
                      <Menu.Item key={index}>
                        {({ active }) => (
                          <Link
                            to={`/o/${daoName}/r/${repoName}/blobs/create/${branch?.name}${treepath && `/${treepath}`}#${item.to}`}
                            className={classNames(
                              "flex justify-between text-right py-1 px-4 text-gray-53596d hover:text-black min-w-[160px]",
                              active ? "text-black" : null,
                              item.className,
                            )}
                          >
                            <div>{item.title}</div>
                            <div className="text-gray-400">{item.subtitle}</div>
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
            {/* <Menu as="div" className="relative">
							<Menu.Button as="div">
								<Button test-id="btn-clone-trigger">
									<FontAwesomeIcon icon={faCode} />
									<span className="hidden sm:inline-block ml-2">Clone</span>
									<FontAwesomeIcon
										icon={faChevronDown}
										size="xs"
										className="ml-2"
									/>
								</Button>
							</Menu.Button>
							<Transition
								as={React.Fragment}
								enter="transition ease-out duration-100"
								enterFrom="transform opacity-0 scale-95"
								enterTo="transform opacity-100 scale-100"
								leave="transition ease-in duration-75"
								leaveFrom="transform opacity-100 scale-100"
								leaveTo="transform opacity-0 scale-95"
							>
								<Menu.Items
									className="dropdown-menu !bg-white px-6 !py-4 max-w-264px sm:max-w-none
                                    absolute top-full right-0 border border-gray-e6edff rounded-lg"
								>
									<div>
										<h3 className="text-sm font-semibold mb-2">
											<FontAwesomeIcon icon={faTerminal} className="mr-2" />
											Clone
										</h3>
										<div>
											<div
												className={classNames(
													"flex items-center",
													"border border-gray-0a1124/65 rounded",
													"text-gray-0a1124/65",
												)}
											>
												<div
													className={classNames(
														"overflow-hidden whitespace-nowrap",
														"text-xs font-mono px-3 py-1",
													)}
												>
													{getRemoteUrl(true)}
												</div>
												<CopyClipboard
													componentProps={{
														text: getRemoteUrl(false),
													}}
													iconContainerClassName={classNames(
														"px-2 border-l border-gray-0a1124",
														"hover:text-gray-0a1124",
													)}
													iconProps={{ size: "sm" }}
													testId="btn-copy-clone"
												/>
											</div>

											<div className="mt-3 text-right text-xs text-gray-7c8db5">
												<a
													href="https://docs.gosh.sh/working-with-gosh/git-remote-helper/"
													target="_blank"
													rel="noreferrer"
													onClick={(e) => {
														onExternalLinkClick(
															e,
															"https://docs.gosh.sh/working-with-gosh/git-remote-helper/",
														);
													}}
												>
													How to setup git remote helper?
												</a>
											</div>
										</div>
									</div>
								</Menu.Items>
							</Transition>
						</Menu> */}
          </div>
        </div>

        {subtree === undefined && (
          <Loader className="text-sm">Loading stages...</Loader>
        )}
        {!!subtree && treepath && (
          <Link
            className="block py-3 border-b border-gray-300 font-medium"
            to={`/o/${daoName}/r/${repoName}/tree/${branchName}${dirUp && `/${dirUp}`}`}
          >
            ..
          </Link>
        )}
        <div className="divide-y divide-gray-e6edff mb-5">
          {subtree?.map((item: any, index: number) => {
            const path = [item.path, item.name]
              .filter((part) => part !== "")
              .join("/");
            const type = item.type === "tree" ? "tree" : "blobs/view";

            if (item.type === "commit") {
              return (
                <div key={index} className="py-3">
                  <span className="fa-layers fa-fw mr-2">
                    <FontAwesomeIcon icon={faFolder} size="1x" />
                    <FontAwesomeIcon
                      icon={faRightLong}
                      transform="shrink-6 down-1"
                      inverse
                    />
                  </span>
                  <span className="text-sm">{item.name}</span>
                </div>
              );
            }

            return (
              <div key={index} className="py-3">
                <Link
                  className="hover:underline"
                  to={`/o/${daoName}/r/${repoName}/${type}/${branchName}/${path}`}
                >
                  <FontAwesomeIcon
                    className="mr-2"
                    icon={item.type === "tree" ? faFolder : faFile}
                    size="1x"
                    fixedWidth
                  />
                  <span className="text-sm">{item.name}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {subtree && !subtree?.length && (
          <div className="text-sm text-gray-7c8db5 text-center py-3">
            There are no files yet
          </div>
        )}

        {branch && (
          <RepoReadme
            className="border border-gray-e6edff rounded-xl overflow-hidden"
            dao={daoName!}
            repo={repoName!}
            branch={branch.name}
            blobs={blobs || []}
          />
        )}
      </div>
    </div>
  );
};

export default StagesPage;
