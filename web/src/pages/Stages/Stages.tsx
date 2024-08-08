import { faHandPaper } from "@fortawesome/free-regular-svg-icons";
import {
  faList,
  faLock,
  faPlus,
  faChevronDown,
  faInfoCircle,
  faMagnifyingGlass,
  faThLarge,
  faCheck,
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
import React, { useCallback, useEffect, useState } from "react";
import {
  AppConfig,
  classNames,
  shortString,
  splitByPath,
  TBranch,
  TTreeItem,
  useBranches,
  useBranchManagement,
  useTree,
} from "react-gosh";
import {
  Link,
  To,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { BranchOperateProgress } from "../../components/Branches";
import { Button, Input } from "../../components/Form";
import Loader from "../../components/Loader";
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
import { useDrag, useDrop } from "react-dnd";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  Droppable,
  DroppableProvided,
  DroppableStateSnapshot,
  DropResult,
} from "react-beautiful-dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDaoMember } from "../../hooks/dao.hooks";
import { useSetRecoilState } from "recoil";
import { appModalStateAtom } from "../../store/app.state";
import { FileMoveModal } from "../../components/Modal/FileMove";

const IconDrag = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="1.90476" cy="2.28562" r="1.90476" />
    <circle cx="1.90476" cy="8.00047" r="1.90476" />
    <circle cx="1.90476" cy="13.7134" r="1.90476" />
    <circle cx="8.09519" cy="2.28562" r="1.90476" />
    <circle cx="8.09519" cy="8.00047" r="1.90476" />
    <circle cx="8.09519" cy="13.7134" r="1.90476" />
  </svg>
);

const StagesPage = () => {
  const treepath = useParams()["*"] || "";
  const { daoName, repoName, branchName } = useParams();
  const navigate = useNavigate();

  const setModal = useSetRecoilState(appModalStateAtom);
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

  const member = useDaoMember({ initialize: true, subscribe: true });

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
  const [branchesDragged, setBranchesDragged] = useState<TBranch[]>([]);
  const [fileView, setFileView] = useState<"tiles" | "list">("tiles");
  const [branchesTouched, setBranchesTouched] = useState<boolean | "idle">(
    false,
  );
  const [search, setSearch] = useState<string>("");

  const getBranches = (branches: TBranch[]) =>
    [...branches]
      .sort((a, b) =>
        a.priority !== undefined && b.priority !== undefined
          ? a.priority - b.priority
          : 1,
      )
      .map((branch, index) => ({
        ...branch,
        priority: index,
      }));

  const cancelReordering = () => {
    setBranchesDragged(getBranches(branches));
    setBranchesTouched(false);
  };

  const submitReordering = async () => {
    await submitOrderingUpdate(branchesDragged);
    setBranchesDragged(getBranches(branches));
    setBranchesTouched(false);
  };

  const handleFileDropToStage = ({
    fileName,
    branch: targetBranch,
    treepath,
  }: {
    fileName: string;
    branch: string;
    treepath: string;
  }) => {
    // console.log(dao);
    // console.log(repository);
    // debugger;

    setModal({
      static: true,
      isOpen: true,
      element: (
        <FileMoveModal
          currentBranch={branch?.name || ""}
          targetBranch={targetBranch}
          fileName={fileName}
          treepath={treepath}
          dao={dao}
          repository={repository}
        />
      ),
    });
  };

  const submitOrderingUpdate = async (branches: TBranch[]) => {
    if (repoName) {
      const { eventaddr } = await updateOrder({
        repo_name: repoName,
        order: branches.map((branch, index) => ({
          name: branch.name,
          priority: branch.priority || index,
        })),
      });
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`);
      }
    }
  };

  const submitProtectionUpdate = async (branch: TBranch, tags: string[]) => {
    if (repoName) {
      const { eventaddr } = await addProtection({
        repo_name: repoName,
        branch: branch.name,
        tags,
      });
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`);
      }
    }
  };

  const submitBranchLock = async (branch: TBranch) => {
    if (repoName) {
      if (branch.isProtected && !branch.tags?.length) {
        const { eventaddr } = await removeProtection({
          repo_name: repoName,
          branch: branch.name,
        });
        if (eventaddr) {
          navigate(`/o/${dao.details.name}/events/${eventaddr}`);
        }
      }
      if (!branch.isProtected) {
        const { eventaddr } = await addProtection({
          repo_name: repoName,
          branch: branch.name,
          tags: [],
        });
        if (eventaddr) {
          navigate(`/o/${dao.details.name}/events/${eventaddr}`);
        }
      }
    }
  };

  useEffect(() => {
    updateBranches();
  }, [updateBranches]);

  useEffect(() => {
    setBranchesDragged(getBranches(branches));
  }, [branches]);

  const onDragEnd = (result: DropResult) => {
    if (
      result.destination?.index !== undefined &&
      result.destination?.index !== result.source.index
    ) {
      setBranchesTouched(true);
      const [start, end, delta] =
        result.destination?.index < result.source.index
          ? [result.destination?.index, result.source.index, 1]
          : [result.source.index, result.destination?.index, -1];

      // if (result.destination?.index < result.source.index) {
      //   for (let index = start; index <= end; index++) {
      //     const element = array[index];
      //   }
      // }
      // let buffer = filtered[result.source.index];
      // filtered[result.source.index].priority =
      console.log(result);
      console.log(result.source, "=> ", result.destination);
      // console.log(result.source.index, "=> ", result.destination?.index);
      // console.log(start, end, delta);
      // console.log(
      //   branchesDragged
      //     .map((branch) =>
      //       branch.priority !== undefined &&
      //       branch.priority >= start &&
      //       branch.priority < end + 1
      //         ? {
      //             ...branch,
      //             priority:
      //               branch.priority === result.source.index
      //                 ? result.destination?.index
      //                 : branch.priority + delta,
      //           }
      //         : branch,
      //     )
      //     .sort((a, b) =>
      //       a.priority !== undefined && b.priority !== undefined
      //         ? a.priority - b.priority
      //         : 1,
      //     ),
      // );
      // debugger;

      setBranchesDragged(
        branchesDragged
          .map((branch) =>
            branch.priority !== undefined &&
            branch.priority >= start &&
            branch.priority < end + 1
              ? {
                  ...branch,
                  priority:
                    branch.priority === result.source.index
                      ? result.destination?.index
                      : branch.priority + delta,
                }
              : branch,
          )
          .sort((a, b) =>
            a.priority !== undefined && b.priority !== undefined
              ? a.priority - b.priority
              : 1,
          ),
      );
    } else if (branchesTouched === "idle") setBranchesTouched(false);
  };

  return (
    <>
      <DragDropContext
        onDragEnd={onDragEnd}
        onBeforeCapture={() => {}}
        onBeforeDragStart={() => {}}
        onDragStart={(data) => {
          console.log(data);
          console.log("START");
          if (!branchesTouched) setBranchesTouched("idle");
        }}
        onDragUpdate={() => {}}
      >
        <DndProvider backend={HTML5Backend}>
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
                      <span className="hidden sm:inline-block ml-2">
                        New stage
                      </span>
                    </PopoverButton>
                    <Popover.Overlay className="fixed inset-0 bg-[#5e656c] opacity-20 z-[10]" />
                    <Popover.Panel
                      as={motion.div}
                      className="absolute origin-top-right right-[0px] top-[42px] mt-2 z-[11] w-[50vw] max-w-[400px] px-5 md:px-0"
                      initial={{ opacity: 0, translateY: "-0.25rem" }}
                      animate={{ opacity: 1, translateY: 0 }}
                      exit={{ opacity: 0, translateY: "0.25rem" }}
                      // transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-xl shadow-sm shadow-[#7c8db5]/5 border border-gray-e6edff bg-white p-4">
                        <StageCreate />
                      </div>
                    </Popover.Panel>
                  </Popover>
                </AnimatePresence>
              </div>
              <div
                className={classNames(
                  "text-xs text-gray-7c8db5 flex flex-row justify-between gap-x-4 px-4 pt-4",
                )}
              >
                <div className={"basis.name grow basis-2 pl-7"}>
                  #&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;Name
                </div>
                <div
                  className={
                    "basis.expert_tags grow-0 shrink-0 basis-[100px] w-[100px] text-left pl-2"
                  }
                >
                  Rules
                </div>
                <div className={"basis.allowance grow basis-2 text-right"}>
                  Access tags
                </div>
              </div>

              {branchProgress.isFetching &&
                branchProgress.type === "create" && (
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
                <Droppable
                  droppableId="stages"
                  // type="COLUMN"
                  direction="vertical"
                >
                  {(dropProvidedStages, dropSnapshotStages) => (
                    <div
                      {...dropProvidedStages.droppableProps}
                      ref={dropProvidedStages.innerRef}
                      // style={{ minHeight: `${branchesDragged.length * 74}px` }}
                    >
                      {branchesDragged.map((branch, index) => (
                        <Draggable
                          key={branch.name}
                          draggableId={branch.name}
                          index={index}
                        >
                          {(dragProvidedStages, dragSnapshotStages) => (
                            <StageDropzone
                              handleFileDropToStage={handleFileDropToStage}
                              name={branch.name}
                              treepath={treepath}
                              dropAvailable={
                                branch.name !== branchName &&
                                Boolean(
                                  member.expert_tags
                                    ?.map((tag) => tag.name)
                                    .filter((value) =>
                                      branch.tags?.includes(value),
                                    ).length,
                                )
                              }
                            >
                              <div
                                key={index}
                                className={classNames(
                                  "relative flex flex-wrap gap-x-4 gap-y-2 items-center px-4 py-3 text-sm rounded-lg border-solid active:rounded-lg mb-2 transition-all",
                                  branchesTouched
                                    ? "bg-[#ffffff] border-[1px] border-[#d6d9e130] shadow-lg hover:scale-[1.02]"
                                    : "bg-[#fafafb] border-[1px] border-[#d6d9e160]",
                                  branchesTouched && "wobbling-items",
                                )}
                                style={{ transform: "translate(0, 0)" }}
                                ref={dragProvidedStages.innerRef}
                                {...dragProvidedStages.draggableProps}
                              >
                                {/* <Droppable
                              droppableId={"files"}
                              // type="PERSON"
                              // draggableId={item.name}
                            >
                              {(dropProvidedStage, dropSnapshotStage) => ( */}
                                <div
                                  // ref={dropProvidedStage.innerRef}
                                  // {...dropProvidedStage.droppableProps}
                                  className="grow flex flex-row items-center gap-3 basis-2"
                                >
                                  <div
                                    className={classNames("opacity-20")}
                                    {...dragProvidedStages.dragHandleProps}
                                  >
                                    {IconDrag}
                                  </div>
                                  <Link
                                    to={`/o/${daoName}/r/${repoName}/tree/${branch.name}`}
                                    className={classNames(
                                      "mr-2 transition-all",
                                      branch.name === branchName
                                        ? "font-bold text-[16px]"
                                        : "font-medium hover:opacity-60 text-[14px]",
                                    )}
                                  >
                                    <div className="wobbler inline-block mr-1">
                                      {(
                                        (branch.priority || 0) + 1
                                      )?.toLocaleString("en-US", {
                                        minimumIntegerDigits: 2,
                                        useGrouping: false,
                                      })}{" "}
                                    </div>
                                    · {branch.name}
                                    {branch.name === branchName && (
                                      <div
                                        className={classNames(
                                          "inline-block align-middle mt-[- 2px] bg-green-34c759 rounded px-1 text-white text-[10px] ml-1",
                                        )}
                                      >
                                        Current
                                      </div>
                                    )}
                                  </Link>
                                </div>
                                {/* )}
                            </Droppable> */}
                                <div className="grow-0 grow flex flex-row items-center gap-1 width-[100px] basis-0">
                                  {dao.details.isAuthMember && (
                                    <div className="flex gap-x-1">
                                      <Button
                                        type="button"
                                        variant="outline-secondary"
                                        size="lg"
                                        onClick={() => submitBranchLock(branch)}
                                        disabled={
                                          branchProgress.isFetching ||
                                          (branch.isProtected &&
                                            Boolean(
                                              ([] as Array<string>).concat(
                                                //@ts-ignore
                                                branch.tags,
                                                //@ts-ignore
                                                branch.isProtected.tags,
                                              ).length,
                                            ))
                                        }
                                        isLoading={
                                          branchProgress.isFetching &&
                                          branchProgress.type === "(un)lock" &&
                                          branchProgress.name === branch.name
                                        }
                                        className={classNames(
                                          "border-none !px-2 !w-[40px] !h-[40px] flex justify-center items-center relative",
                                          "opacity-[1]",
                                          branch.isProtected &&
                                            !Boolean(
                                              ([] as Array<string>).concat(
                                                //@ts-ignore
                                                branch.tags,
                                                //@ts-ignore
                                                branch.isProtected.tags,
                                              ).length,
                                            )
                                            ? "!text-black"
                                            : "!text-[#BFC5CE]",
                                        )}
                                      >
                                        <FontAwesomeIcon
                                          size="lg"
                                          icon={faLock}
                                        />
                                      </Button>

                                      <AnimatePresence mode="wait">
                                        <Popover as="div" className="relative">
                                          <PopoverButton
                                            as={Button}
                                            test-id="btn-add-stage"
                                            variant="outline-secondary"
                                            disabled={
                                              branchProgress.isFetching ||
                                              (branch.isProtected &&
                                                !Boolean(
                                                  ([] as Array<string>).concat(
                                                    //@ts-ignore
                                                    branch.tags,
                                                    //@ts-ignore
                                                    branch.isProtected.tags,
                                                  ).length,
                                                ))
                                            }
                                            // className="outline-none border-none !px-2 !w-[40px] !h-[40px]"
                                            className={classNames(
                                              "outline-none border-none !px-2 !w-[40px] !h-[40px]",
                                              "opacity-[1]",
                                              branch.isProtected &&
                                                Boolean(
                                                  ([] as Array<string>).concat(
                                                    //@ts-ignore
                                                    branch.tags,
                                                    //@ts-ignore
                                                    branch.isProtected.tags,
                                                  ).length,
                                                )
                                                ? "!text-black"
                                                : "!text-[#BFC5CE]",
                                            )}
                                          >
                                            <FontAwesomeIcon
                                              size="xl"
                                              icon={faHandPaper}
                                            />
                                          </PopoverButton>
                                          <PopoverPanel
                                            as={motion.div}
                                            className="absolute origin-top-right left-[0px] top-[42px] mt-2 w-auto max-w-[400px] min-w-[200px] md:px-0 z-20 cursor-default"
                                            initial={{
                                              opacity: 0,
                                              translateY: "-0.25rem",
                                            }}
                                            animate={{
                                              opacity: 1,
                                              translateY: 0,
                                            }}
                                            exit={{
                                              opacity: 0,
                                              translateY: "0.25rem",
                                            }}
                                            // transition={{ duration: 0.2 }}
                                          >
                                            <div className="rounded-xl shadow-sm shadow-xl border-[1px] border-[#d6d9e130] bg-white p-4">
                                              <Formik
                                                initialValues={{
                                                  tags: branch.tags || [],
                                                }}
                                                onSubmit={() => {}}
                                                validationSchema={yup
                                                  .object()
                                                  .shape({
                                                    tags: yup
                                                      .string()
                                                      .matches(
                                                        /^[\w-]+$/,
                                                        "Name has invalid characters",
                                                      )
                                                      .max(
                                                        64,
                                                        "Max length is 64 characters",
                                                      )
                                                      .notOneOf(
                                                        branches.map(
                                                          (b) => b.name,
                                                        ),
                                                        "Stage exists",
                                                      )
                                                      .required(
                                                        "Stage name is required",
                                                      ),
                                                  })}
                                              >
                                                {({ values, setValues }) => (
                                                  <Form className="flex flex-col items-start justify-end gap-4">
                                                    <h3>Select Tags</h3>
                                                    <div className="rounded-xl bg-white ">
                                                      {dao.details.expert_tags?.map(
                                                        (tag, index) => {
                                                          const isChecked =
                                                            values.tags.includes(
                                                              tag.name,
                                                            );
                                                          return (
                                                            <div
                                                              key={index}
                                                              className={classNames(
                                                                "border border-transparent rounded-3xl p-2 px-4 gap-2 m-1 flex flex-row justify-start items-center min-w-min",
                                                                "text-sm",
                                                                isChecked
                                                                  ? "bg-[#838a98] text-white"
                                                                  : "bg-[#F4F4F5]",
                                                              )}
                                                              onClick={() => {
                                                                setValues({
                                                                  tags: isChecked
                                                                    ? values.tags.filter(
                                                                        (t) =>
                                                                          t !==
                                                                          tag.name,
                                                                      )
                                                                    : [
                                                                        ...values.tags,
                                                                        tag.name,
                                                                      ],
                                                                });
                                                              }}
                                                            >
                                                              <div
                                                                className={classNames(
                                                                  "p-[2px] rounded-md",
                                                                  isChecked
                                                                    ? "bg-transparent border border-transparent"
                                                                    : "bg-white border border-[#dddddd] rounded-md sha",
                                                                )}
                                                              >
                                                                <FontAwesomeIcon
                                                                  className={classNames(
                                                                    "mr-1 opacity-[1] text-lg",
                                                                    isChecked
                                                                      ? "text-[#30C054]"
                                                                      : "text-transparent",
                                                                  )}
                                                                  size="lg"
                                                                  icon={faCheck}
                                                                />
                                                              </div>
                                                              {tag.name}
                                                            </div>
                                                          );
                                                        },
                                                      )}
                                                    </div>
                                                    <Button
                                                      className="w-full"
                                                      size="lg"
                                                      onClick={() =>
                                                        submitProtectionUpdate(
                                                          branch,
                                                          values.tags,
                                                        )
                                                      }
                                                    >
                                                      Confirm
                                                    </Button>
                                                  </Form>
                                                )}
                                              </Formik>
                                            </div>
                                          </PopoverPanel>
                                        </Popover>
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                                <div className="grow flex flex-row items-center gap-1 basis-2 justify-end">
                                  {branch.tags?.map((tag, index) => (
                                    <div
                                      key={index}
                                      className={classNames(
                                        "border border-transparent rounded-3xl p-1.5 px-3 gap-2 flex flex-row justify-start items-center min-w-min",
                                        "text-sm",
                                        "bg-[#838a98] text-white",
                                      )}
                                    >
                                      {tag}
                                    </div>
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
                            </StageDropzone>
                          )}
                        </Draggable>
                      ))}
                      {dropProvidedStages.placeholder}
                    </div>
                  )}
                </Droppable>
                <div
                  className={classNames(
                    "flex flex-row gap-4 justify-end items-center",
                    branchesTouched === true
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none",
                  )}
                >
                  <Button
                    className="w-[100px]"
                    variant="secondary"
                    onClick={cancelReordering}
                    size="xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="w-[100px]"
                    size="xl"
                    onClick={submitReordering}
                  >
                    Save
                  </Button>
                </div>
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
                <Input
                  className={classNames("bg-[#F9F9FA] rounded-lg h-[36px]")}
                  type="search"
                  placeholder="Find file"
                  autoComplete="off"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  before={
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="text-gray-7c8db5 font-extralight py-2 pl-2"
                    />
                  }
                />
                <div className="flex flex-row justify-start items-center gap-0">
                  <Button
                    onClick={() => setFileView("tiles")}
                    // size="lg"
                    variant="secondary"
                    className={classNames(
                      "outline-none rounded-none rounded-tl-lg rounded-bl-lg",
                      fileView === "tiles" ? "color-black" : "text-gray-7c8db5",
                    )}
                  >
                    <FontAwesomeIcon
                      icon={faThLarge}
                      className="font-extralight"
                    />
                  </Button>
                  <Button
                    onClick={() => setFileView("list")}
                    // size="lg"
                    variant="secondary"
                    className={classNames(
                      "outline-none rounded-none rounded-tr-lg rounded-br-lg",
                      fileView === "list" ? "color-black" : "text-gray-7c8db5",
                    )}
                  >
                    <FontAwesomeIcon
                      icon={faList}
                      className="font-extralight"
                    />
                  </Button>
                </div>

                <div className="flex grow gap-3 justify-end">
                  {(!branch?.isProtected ||
                    (branch.isProtected &&
                      (Boolean(
                        member.expert_tags
                          ?.map((tag) => tag.name)
                          .filter((value) => branch.tags?.includes(value))
                          .length,
                      ) ||
                        !Boolean(
                          ([] as Array<string>).concat(
                            //@ts-ignore
                            branch.tags,
                            //@ts-ignore
                            branch.isProtected.tags,
                          ).length,
                        )))) &&
                    dao.details.isAuthMember && (
                      <Menu as="div" className="relative">
                        <MenuButton test-id="btn-clone-trigger" as={Button}>
                          <span className="hidden sm:inline-block ml-1">
                            Add file
                          </span>
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            size="sm"
                            className="ml-2 opacity-50"
                          />
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
                                    <div className="text-gray-400">
                                      {item.subtitle}
                                    </div>
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
              {/* <Droppable
                droppableId={"files"}
                type={"COLUMN"}
              >
                {(
                  dropProvided: DroppableProvided,
                  dropSnapshot: DroppableStateSnapshot,
                ) => ( */}
              <div
              // ref={dropProvided.innerRef}
              // {...dropProvided.droppableProps}
              >
                {subtree && (
                  <FileListList
                    data={{ daoName, repoName, branchName }}
                    files={subtree}
                    view={fileView}
                    onDragEnd={() => {
                      setBranchesTouched(false);
                    }}
                    onDragStart={() => {
                      if (!branchesTouched) setBranchesTouched("idle");
                    }}
                  />
                )}
              </div>
              {/* //   )}
              // </Droppable> */}

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
        </DndProvider>
      </DragDropContext>
    </>
  );
};

interface IFileItemProps extends React.HTMLAttributes<HTMLDivElement> {
  provided?: DraggableProvided;
  view?: TView;
  to: string;
  path: string;
  name: string;
  type: string | "tree";
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface IFileViewProps extends React.HTMLAttributes<HTMLDivElement> {
  files: TFile[];
  view?: TView;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  data: { [key: string]: any };
}
interface IDropzoneProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  treepath: string;
  dropAvailable?: boolean;
  handleFileDropToStage: (props: any) => any | void;
}

type TView = "tiles" | "list";
interface TFile extends TTreeItem {}

const FileListList = React.memo(
  ({ files, view = "list", onDragStart, onDragEnd, data }: IFileViewProps) => {
    return files.map((file: TFile, index: number) => (
      // <Draggable
      //   key={`${file.name}${index}`}
      //   draggableId={file.name}
      //   index={index}
      // >
      //   {(
      //     dragProvided: DraggableProvided,
      //     dragSnapshot: DraggableStateSnapshot,
      //   ) => (
      <FileItem
        key={`${file.name}${index}`}
        path={file.path}
        to={`/o/${data.daoName}/r/${data.repoName}/${file.type === "tree" ? "tree" : "blobs/view"}/${data.branchName}/`}
        name={file.name}
        type={file.type}
        view={view}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        // isDragging={dragSnapshot.isDragging}
        // isGroupedOver={Boolean(dragSnapshot.combineTargetFor)}
        // provided={dragProvided}
      />
      //   )}
      // </Draggable>
    ));
  },
);

const StageDropzone = ({
  name,
  treepath,
  dropAvailable,
  handleFileDropToStage,
  children,
}: IDropzoneProps) => {
  const [{ canDrop, isOver, getDropResult }, drop] = useDrop(() => ({
    // The type (or types) to accept - strings or symbols
    accept: "FILE",
    // Props to collect
    drop: (item: any) => handleDrop(item),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      getDropResult: monitor.getDropResult(),
      // item: () => {
      //   debugger;
      //   return {};
      // },
    }),
    end: { p: name },
  }));

  const handleDrop = useCallback(
    (item: any) => {
      if (dropAvailable)
        handleFileDropToStage({
          fileName: item.name,
          branch: name,
          treepath: treepath,
        });
    },
    [dropAvailable],
  );

  useEffect(() => {
    console.log(getDropResult);

    return () => {
      // second
    };
  }, [getDropResult]);

  return (
    <div ref={drop} className={classNames("relative")}>
      {canDrop && isOver && dropAvailable && (
        <div
          className={classNames(
            "absolute top-0 left-0 bottom-0 right-0 z-10 p-2 px-4 pl-10 flex justify-start items-center text-left backdrop-blur-md bg-[#000009ac] rounded-lg transition-all",
            isOver ? "opacity-100 text-white" : "opacity-0",
          )}
        >
          Move file to
          <span
            className={classNames(
              "inline-block align-middle mt-[- 2px] bg-[#000000] rounded px-1 text-white text-[14px] ml-1 font-bold",
            )}
          >
            {name}
          </span>
        </div>
      )}
      {children}
    </div>
  );
};

export const FileItem = ({
  // provided,
  path,
  name,
  to,
  type,
  onDragStart,
  onDragEnd,
  view = "tiles",
  className,
  ...props
}: IFileItemProps) => {
  const [selected, setSelected] = useState<boolean>(false);
  const [{ isDragging, ...collected }, drag, dragPreview] = useDrag(() => ({
    type: "FILE",
    item: () => {
      onDragStart && onDragStart();
      return { name };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      onDragEnd && onDragEnd();
    },
  }));
  const combinedPath = [path, name].filter((part) => part !== "").join("/");

  useEffect(() => {
    if (isDragging) {
      onDragStart && onDragStart();
    } else {
      onDragEnd && onDragEnd();
    }

    return () => {};
  }, [isDragging]);

  return isDragging ? (
    <div ref={dragPreview} className="rounded-lg" />
  ) : (
    <div
      ref={drag}
      {...collected}
      aria-label={name}
      className={classNames(
        className,
        selected
          ? "bg-[#fafafb] border-[1px] border-[#d6d9e160]"
          : "border-[1px] border-transparent",
        view === "tiles"
          ? "flex flex-col justify-stretch items-center max-w-[120px] p-6 rounded-lg"
          : "flex flex-row justify-stretch items-center",
      )}
      // ref={provided.innerRef}
      onClick={(e) => {
        setSelected(!selected);
        props.onClick && props.onClick(e);
      }}
    >
      {/* {view === "tiles" ? ( */}
      <FileIcon
        className={classNames(
          view === "tiles" ? "w-[55px] h-[60px]" : "w-[20px] h-auto mr-2",
        )}
      />
      <Link className="hover:underline" to={`${to}${combinedPath}`}>
        <span className="text-sm">{name}</span>
      </Link>
    </div>
  );
};

export const FileIcon = ({
  className,
}: React.HTMLAttributes<HTMLOrSVGElement>) => (
  <svg
    viewBox="0 0 55 69"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.01475 0.456055H37.6471L55.0001 17.809V64.6619C55.0001 67.0579 53.0578 69.0002 50.6618 69.0002H5.01475C2.61881 69.0002 0.676514 67.0579 0.676514 64.6619V4.79429C0.676514 2.39835 2.61881 0.456055 5.01475 0.456055Z"
      fill="#F2F3F8"
    />
    <path
      d="M37.6472 0.456055L55.0027 17.8088H42.6472C39.8858 17.8088 37.6472 15.5702 37.6472 12.8088V0.456055Z"
      fill="#DBDEE5"
    />
  </svg>
);

export default StagesPage;
