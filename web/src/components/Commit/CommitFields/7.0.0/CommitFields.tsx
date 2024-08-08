import { ErrorMessage, Field, useFormikContext } from "formik";
import { useEffect, useState } from "react";
import {
  TPushProgress,
  TTaskDetails,
  classNames,
  useTaskList,
} from "react-gosh";
import { IGoshDaoAdapter } from "react-gosh/dist/gosh/interfaces";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../Form";
import {
  FormikCheckbox,
  FormikInput,
  FormikSelect,
  FormikTextarea,
} from "../../../Formik";
import { UserSelect } from "../../../UserSelect/UserSelect_";
import CommitProgress from "../../CommitProgress";
import { TBlobCommitFormValues } from "../../BlobCommitForm";

type TCommitFieldsProps<T> = {
  dao: IGoshDaoAdapter;
  repository: string;
  className?: string;
  isSubmitting: boolean;
  isDisabled: boolean;
  isProposal: boolean | undefined;
  urlBack?: string;
  extraButtons?: any;
  progress?: TPushProgress;
  config?: { [key: string]: boolean };
  onCancel?: () => void;
};

const CommitFields = <T,>(props: TCommitFieldsProps<T>) => {
  const {
    dao,
    repository,
    className,
    isSubmitting,
    isDisabled,
    urlBack,
    extraButtons,
    progress,
    isProposal,
    config,
    onCancel,
  } = props;
  const { setFieldValue, values } = useFormikContext<TBlobCommitFormValues>();
  const tasks = useTaskList(dao, { repository, perPage: 0 });
  const [grant, setGrant] = useState<TTaskDetails["config"] | null>(null);
  const [team, setTeam] = useState<TTaskDetails["team"] | null>(null);

  useEffect(() => {
    if (isProposal !== undefined) {
      setFieldValue("isPullRequest", isProposal);
    }
  }, [isProposal]);

  return (
    <div
      className={classNames(
        "border border-gray-e6edff rounded-xl py-5",
        className,
      )}
    >
      <div
        className={classNames(
          "flex flex-wrap justify-between",
          "divide-x divide-gray-e6edff py-5",
        )}
      >
        <div className="grow px-5">
          <div>
            <Field
              name="title"
              component={FormikInput}
              autoComplete="off"
              placeholder="Commit title"
              disabled={isSubmitting}
              test-id="input-commit-title"
            />
          </div>
          <div className="mt-6">
            <Field
              name="message"
              component={FormikTextarea}
              label="Commit description (optional)"
              placeholder="Commit description"
              disabled={isSubmitting}
              test-id="input-commit-message"
            />
          </div>
          <div className="mt-6">
            <Field
              name="tags"
              component={FormikInput}
              label="Commit tags (optional)"
              placeholder="Commit tags"
              help="Enter a space after each tag"
              autoComplete="off"
              disabled={isSubmitting}
              test-id="input-commit-tags"
            />
          </div>
        </div>
        {(config === undefined || config.task) && (
          <div className="basis-5/12 px-5">
            <div>
              <Field
                name="task"
                component={FormikSelect}
                label="Select task (optional)"
                disabled={isSubmitting || tasks.isFetching}
                test-id="input-commit-task"
                onChange={(e: any) => {
                  const option = e.target[e.target.options.selectedIndex];
                  setFieldValue("task", e.target.value);
                  setGrant(JSON.parse(option.getAttribute("data-grant")));

                  const team = JSON.parse(option.getAttribute("data-team"));
                  console.debug("team", team);
                  setTeam(team);
                  if (team) {
                    setFieldValue(
                      "assigners",
                      team.assigners.map((item: any) => ({
                        name: item.username,
                        type: "user",
                      })),
                    );
                    setFieldValue(
                      "reviewers",
                      team.reviewers.map((item: any) => ({
                        name: item.username,
                        type: "user",
                      })),
                    );
                    setFieldValue(
                      "managers",
                      team.managers.map((item: any) => ({
                        name: item.username,
                        type: "user",
                      })),
                    );
                  }
                }}
              >
                <option value="">
                  {tasks.isFetching ? "Loading..." : "Select task"}
                </option>
                {tasks.items
                  .filter(({ confirmed }) => !confirmed)
                  .map((item, index) => (
                    <option
                      key={index}
                      value={item.name}
                      data-grant={JSON.stringify(item.config)}
                      data-team={JSON.stringify(item.team)}
                    >
                      {item.name}
                    </option>
                  ))}
              </Field>
            </div>
            <div className="mt-6">
              <label className="block mb-2 font-medium text-gray-7c8db5">
                Assigners
              </label>
              <UserSelect
                gosh={dao.getGosh()}
                placeholder="Assigners"
                isMulti
                isDisabled={isSubmitting || !grant?.assign.length || !!team}
                value={(values as any).assigners.map((v: any) => ({
                  label: v.name,
                  value: v,
                }))}
                onChange={(selected) => {
                  setFieldValue(
                    "assigners",
                    selected?.map((item: any) => item.value),
                  );
                }}
                test-id="input-commit-assigners"
              />
              <ErrorMessage
                className="text-xs text-red-ff3b30 mt-1"
                component="div"
                name={`assigners`}
              />
            </div>
            <div className="mt-6">
              <label className="block mb-2 font-medium text-gray-7c8db5">
                Reviewers
              </label>
              <UserSelect
                gosh={dao.getGosh()}
                placeholder="Reviewers"
                isMulti
                isDisabled={isSubmitting || !grant?.review.length || !!team}
                value={(values as any).reviewers.map((v: any) => ({
                  label: v.name,
                  value: v,
                }))}
                onChange={(selected) => {
                  setFieldValue(
                    "reviewers",
                    selected?.map((item: any) => item.value),
                  );
                }}
                test-id="input-commit-reviewers"
              />
            </div>
            <div className="mt-6">
              <label className="block mb-2 font-medium text-gray-7c8db5">
                Managers
              </label>
              <UserSelect
                gosh={dao.getGosh()}
                placeholder="Managers"
                isMulti
                isDisabled={isSubmitting || !grant?.manager.length || !!team}
                value={(values as any).managers.map((v: any) => ({
                  label: v.name,
                  value: v,
                }))}
                onChange={(selected) => {
                  setFieldValue(
                    "managers",
                    selected?.map((item: any) => item.value),
                  );
                }}
                test-id="input-commit-managers"
              />
            </div>
          </div>
        )}
      </div>

      <div
        className={classNames(
          "border-t border-gray-e6edff px-5 pt-5",
          "flex flex-wrap items-center gap-10",
        )}
      >
        <div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || isDisabled}
              isLoading={isSubmitting || isDisabled}
              test-id="btn-commit-submit"
            >
              Commit changes
            </Button>
            {urlBack && (
              <Button
                variant="outline-danger"
                disabled={isSubmitting}
                onClick={onCancel}
                test-id="btn-commit-discard"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div>
          <Field
            name="isPullRequest"
            component={FormikCheckbox}
            disabled={isSubmitting || isProposal !== undefined}
            inputProps={{
              label: "Create proposal",
              ...(isProposal !== undefined ? { value: isProposal } : {}),
            }}
            value={isProposal ? "yes" : values.isPullRequest}
            test-id="input-commit-proposal"
          />
        </div>

        {extraButtons && <div>{extraButtons}</div>}
      </div>

      {isSubmitting && progress && (
        <div className="mt-6 px-5">
          <CommitProgress {...progress} />
        </div>
      )}
    </div>
  );
};

export default CommitFields;
