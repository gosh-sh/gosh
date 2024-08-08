import { TPushProgress } from "react-gosh";
import { IGoshDaoAdapter } from "react-gosh/dist/gosh/interfaces";
import COMMIT_FIELDS from "./7.0.0/CommitFields";

type TCommitFieldsProps<T> = {
  dao: IGoshDaoAdapter;
  repository: string;
  isSubmitting: boolean;
  isDisabled: boolean;
  isProposal: boolean | undefined;
  className?: string;
  urlBack?: string;
  extraButtons?: any;
  progress?: TPushProgress;
  config?: { [key in keyof T]: boolean };
  onCancel?: () => void;
};

const CommitFields = <T,>(props: TCommitFieldsProps<T>) => {
  const { dao, repository, ...rest } = props;
  const version = dao.getVersion();

  // if (version === '1.0.0') {
  //   return <COMMIT_FIELDS_1_0_0 {...rest} />
  // } else if (version === '2.0.0') {
  //   return <COMMIT_FIELDS_2_0_0 dao={dao} repository={repository} {...rest} />
  // } else if (version <= '6.2.0') {
  //   return <COMMIT_FIELDS_3_0_0 dao={dao} repository={repository} {...rest} />
  // } else {
  return <COMMIT_FIELDS<T> dao={dao} repository={repository} {...rest} />;
  // }
};

export { CommitFields };
