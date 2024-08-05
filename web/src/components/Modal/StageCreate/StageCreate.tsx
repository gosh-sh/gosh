import { useEffect, useState } from "react";
import {
  faChevronRight,
  faLock,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Field, Form, Formik, FormikHelpers } from "formik";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { FormikInput } from "../../Formik";
import { useBranchManagement, useBranches } from "react-gosh";
import { TRepoLayoutOutletContext } from "../../../pages/RepoLayout";
import { EGoshError, GoshError } from "react-gosh";
import { toast } from "react-toastify";
import { ToastError } from "../../Toast";
import { TBranch } from "react-gosh/dist/types/repo.types";
import { BranchOperateProgress, BranchSelect } from "../../Branches";
import yup from "../../../yup-extended";
import { Button } from "../../Form";
import CommitProgress from "../../Commit/CommitProgress";

type TCreateBranchFormValues = {
  newName: string;
  from?: TBranch;
};

export const StageCreate = () => {
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>();
  const [branchName, setBranchName] = useState<string>("main");
  const { branches, branch } = useBranches(repository.adapter, branchName);
  const {
    create: createBranch,
    progress: branchProgress,
    pushProgress,
  } = useBranchManagement(dao.details, repository.adapter);

  const onStageCreate = async (
    values: TCreateBranchFormValues,
    helpers: FormikHelpers<any>,
  ) => {
    try {
      const { newName, from } = values;
      if (!from) throw new GoshError(EGoshError.NO_BRANCH);

      await createBranch(newName, from.name);
      helpers.resetForm();
      helpers.setFieldValue("from", values.from);
    } catch (e: any) {
      console.error(e);
      toast.error(<ToastError error={e} />);
    }
  };

  return (
    <>
      {dao.details.isAuthMember && (
        <Formik
          initialValues={{ newName: "", from: branch }}
          onSubmit={onStageCreate}
          validationSchema={yup.object().shape({
            newName: yup
              .string()
              .matches(/^[\w-]+$/, "Name has invalid characters")
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
              <div className="flex flex-wrap flex-row  items-center self-stretch justify-center">
                <div className="grow basis-1">
                  <BranchSelect
                    branch={branch}
                    placeholder={"stage"}
                    branches={branches}
                    onChange={(selected) => {
                      if (selected) {
                        setBranchName(selected?.name);
                        setFieldValue("from", selected);
                      }
                    }}
                    disabled={isSubmitting}
                    className="!max-w-full !w-full"
                  />
                </div>
                <span className="mx-3">
                  <FontAwesomeIcon icon={faChevronRight} size="sm" />
                </span>
                <div className="grow basis-1">
                  <Field
                    className="w-full"
                    name="newName"
                    component={FormikInput}
                    errorEnabled={false}
                    placeholder="Stage name"
                    autoComplete="off"
                    disabled={isSubmitting}
                    onChange={(e: any) => {
                      setFieldValue("newName", e.target.value.toLowerCase());
                    }}
                    test-id="input-branch-name"
                  />
                </div>
              </div>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                test-id="btn-branch-create"
              >
                Create stage
              </Button>
            </Form>
          )}
        </Formik>
      )}

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
    </>
  );
};

export default StageCreate;
