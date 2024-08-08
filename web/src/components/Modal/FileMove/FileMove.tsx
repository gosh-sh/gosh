import { Dialog } from "@headlessui/react";
import { Field, Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import AsyncSelect from "react-select/async";
import CreatableSelect from "react-select/creatable";
import { useSetRecoilState } from "recoil";
import { Button } from "../../Form";
import {
  BaseField,
  FormikInput,
  FormikSlider,
  FormikTextarea,
} from "../../Formik";
import { ModalCloseButton } from "..";
import { Select2ClassNames } from "../../../helpers";
import { appModalStateAtom } from "../../../store/app.state";
import { getSystemContract } from "../../../blockchain/helpers";
import { useCreateTask, useDao, useDaoMember } from "../../../hooks/dao.hooks";
import { useDaoRepositoryList } from "../../../hooks/repository.hooks";
import yup from "../../../yup-extended";
import classNames from "classnames";
import { FileIcon } from "../../../pages/Stages";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  splitByPath,
  TDao,
  TRepository,
  TUserParam,
  useBlob,
  useBranches,
  usePush,
} from "react-gosh";
import { CommitFields } from "../../Commit/CommitFields/CommitFields";
import { TRepoLayoutOutletContext } from "../../../pages/StagesLayout";
import {
  IGoshDaoAdapter,
  IGoshRepositoryAdapter,
} from "react-gosh/dist/gosh/interfaces";
import { toast } from "react-toastify";
import { ToastError } from "../../Toast";

// type TFormValues = {
//   name: string;
//   cost: number;
//   assign: number;
//   review: number;
//   manager: number;
//   lock: number;
//   vesting: number;
//   tags?: string[];
//   comment?: string;
// };
export type TFileMoveFormValues = {
  name: string;
  content: string;
  title: string;
  message?: string;
  tags?: string;
  task?: string;
  assigners?: string | TUserParam[];
  reviewers?: string | TUserParam[];
  managers?: string | TUserParam[];
  isPullRequest?: boolean;
};

interface IFileMoveModalProps extends React.HTMLAttributes<HTMLDivElement> {
  currentBranch: string;
  targetBranch: string;
  fileName: string;
  treepath: string;
  dao: {
    adapter: IGoshDaoAdapter;
    details: TDao;
  };
  repository: {
    adapter: IGoshRepositoryAdapter;
    details: TRepository;
  };
  handleMoveFile?: (props: any) => any | void;
}

const FileItem = ({
  className,
  name,
  branch,
}: React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  branch: string;
}) => (
  <div
    className={classNames(
      className,
      "border-[1px] border-transparent",
      "flex flex-col justify-stretch items-center max-w-[120px] p-6 rounded-lg",
    )}
  >
    {/* {view === "tiles" ? ( */}
    <FileIcon className={classNames("w-[55px] h-[60px]")} />
    <span className="text-sm">{name}</span>
    <div className="mt-2 text-sm bg-[#5EBCFF] rounded-md p-1 px-3">
      {branch}
    </div>
  </div>
);

const FileMoveModal = ({
  currentBranch,
  targetBranch,
  fileName,
  treepath: treepathParams,
  dao,
  repository,
}: IFileMoveModalProps) => {
  const treepathLocation = useParams()["*"];
  const navigate = useNavigate();
  const setModal = useSetRecoilState(appModalStateAtom);

  const repositories = useDaoRepositoryList({ initialize: true });
  const { branches, branch } = useBranches(repository.adapter, targetBranch);
  const member = useDaoMember({ initialize: true, subscribe: true });
  const [formReady, setFormReady] = useState<boolean>(false);

  const treepath = treepathParams || treepathLocation;
  const combinedPath = [treepath, fileName]
    .filter((part) => part !== "" && part)
    .join("/");

  const currentBlob = useBlob(
    dao.details.name!,
    repository.details.name!,
    currentBranch,
    combinedPath,
  );
  const targetBlob = useBlob(
    dao.details.name!,
    repository.details.name!,
    targetBranch,
    combinedPath,
  );

  const { push, progress: pushProgress } = usePush(
    dao.details,
    repository.adapter,
    targetBranch,
  );

  useEffect(() => {
    if (!targetBlob.isFetching && !currentBlob.isFetching) setFormReady(true);
  }, [targetBlob.isFetching, currentBlob.isFetching]);

  const urlBack = `/o/${dao.details.name}/r/${repository.details.name}/blobs/view/${currentBranch}/${treepath}`;

  const isPullRequest = branch?.isProtected
    ? branch?.tags?.length
      ? Boolean(
          member.expert_tags
            ?.map((tag) => tag.name)
            .filter((value) => branch?.tags?.includes(value)).length,
        )
        ? undefined
        : false
      : true
    : undefined;

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }));
  };

  const onSubmit = async (values: TFileMoveFormValues) => {
    if (
      currentBlob.isFetching ||
      targetBlob.isFetching ||
      !currentBlob.content
    ) {
      return;
    }
    try {
      const { name, title, message, tags, isPullRequest } = values;
      const currentContent = currentBlob.content;
      const targetContent = targetBlob.content;
      const [path] = splitByPath(treepath! || "");
      const bPath = `${path ? `${path}/` : ""}${name}`;
      const blobObject =
        targetBlob?.content && targetBlob?.address
          ? {
              treepath: [treepath!, bPath],
              original: targetContent ?? "",
              modified: currentContent,
            }
          : {
              treepath: [treepath!, bPath],
              original: "",
              modified: currentContent,
            };

      const eventaddr = await push(title, [blobObject], {
        isPullRequest,
        message,
        tags,
      });

      onModalReset();
      if (isPullRequest) {
        navigate(`/o/${dao.details.name}/events/${eventaddr || ""}`, {
          replace: true,
        });
      } else {
        navigate(urlBack.replace(treepath!, bPath));
      }
    } catch (e: any) {
      console.error(e.message);
      toast.error(<ToastError error={e} />);
    }
  };

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{
          name: fileName,
          content: "",
          title: `Copy ${fileName} from ${currentBranch} to ${targetBranch}`,
          message: "",
          tags: "",
          assigners: [],
          reviewers: [],
          managers: [],
          isPullRequest: false,
        }}
        // validationSchema={yup.object().shape({
        //   name: yup.string().required(),
        //   title: yup.string().required(),
        //   tags: yup.array().of(yup.string()).max(3),
        //   comment: yup.string(),
        // })}
        enableReinitialize
        onSubmit={(values, actions) => {
          onSubmit(values);
        }}
      >
        {({ values, isSubmitting, setFieldValue }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
              Move File
            </Dialog.Title>

            <div
              className={classNames(
                "flex flex-row justify-center gap-2 items-center",
              )}
            >
              <FileItem name={fileName} branch={currentBranch} />
              <FontAwesomeIcon
                icon={faArrowRight}
                className="text-[#CBCDD3] text-sm m-4 relative top-[-1px] cursor-pointer"
              />
              <FileItem name={fileName} branch={targetBranch} />
            </div>

            <hr className="my-12 bg-gray-e6edff" />

            <CommitFields<TFileMoveFormValues>
              config={{
                name: true,
                content: true,
                title: true,
                message: true,
                tags: false,
                task: false,
                assigners: false,
                reviewers: false,
                managers: false,
                isPullRequest: true,
              }}
              isProposal={isPullRequest}
              dao={dao.adapter}
              repository={repository.details.name}
              className="mt-12"
              isSubmitting={isSubmitting}
              isDisabled={!formReady}
              onCancel={() =>
                navigate(
                  `/o/${dao.details.name}/r/${repository.details.name}/tree/${targetBranch}`,
                )
              }
              urlBack={`/o/${dao.details.name}/r/${repository.details.name}/tree/${targetBranch}`}
              progress={pushProgress}
            />
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  );
};

export { FileMoveModal };
