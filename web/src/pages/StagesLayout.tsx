import { useEffect, useState } from "react";
import {
  faCodePullRequest,
  faCube,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import Spinner from "../components/Spinner";
import {
  classNames,
  useRepo,
  TWalletDetails,
  TDao,
  useBranches,
  TRepository,
  shortString,
  AppConfig,
  useUser,
  GoshAdapterFactory,
} from "react-gosh";
import {
  IGoshDaoAdapter,
  IGoshRepositoryAdapter,
  IGoshWallet,
} from "react-gosh/dist/gosh/interfaces";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import Loader from "../components/Loader";
import { withPin } from "../hocs";
import { getIdenticonAvatar } from "../helpers";
import CopyClipboard from "../components/CopyClipboard";
import { useDao } from "../hooks/dao.hooks";

export type TRepoLayoutOutletContext = {
  dao: {
    adapter: IGoshDaoAdapter;
    details: TDao;
  };
  repository: {
    adapter: IGoshRepositoryAdapter;
    details: TRepository;
  };
  wallet?: {
    instance: IGoshWallet;
    details: TWalletDetails;
  };
};

const RepoLayout = () => {
  const { persist, user } = useUser();
  const { daoName, repoName, branchName } = useParams();
  const { dao, repository, isFetching } = useRepo(daoName!, repoName!);

  const {
    details: { account },
  } = useDao({ initialize: true, subscribe: true });
  const { updateBranches } = useBranches(repository.adapter);
  const [isReady, setIsReady] = useState<boolean>(false);

  const getTabs = () => {
    const tabs = [
      {
        to: `/o/${daoName}/r/${repoName}${branchName ? `/tree/${branchName}` : ""}`,
        title: "Files",
        icon: faFile,
      },
      {
        to: `/o/${daoName}/r/${repoName}/branches`,
        title: "Branches",
        icon: faCodeBranch,
      },
    ];

    if (dao.details?.isAuthMember) {
      tabs.push({
        to: `/o/${daoName}/r/${repoName}/merge`,
        title: "Merge",
        icon: faCodePullRequest,
      });
    }

    if (!!AppConfig.dockerclient) {
      tabs.push({
        to: `/o/${daoName}/r/${repoName}/build/${branchName}`,
        title: "Build image",
        icon: faCube,
      });
    }

    return [];
    return tabs;
  };

  // TODO: Remove this after git part refactor
  useEffect(() => {
    Object.keys(AppConfig.versions)
      .map((version) => {
        return GoshAdapterFactory.create(version);
      })
      .map((gosh) => {
        const { username } = persist;
        const { keys } = user;
        if (username && keys) {
          gosh.setAuth(username, keys);
        } else {
          gosh.resetAuth();
        }
      });
  }, []);
  // /TODO: Remove this after git part refactor

  useEffect(() => {
    const _setup = async () => {
      if (isFetching) return;

      await updateBranches();
      console.debug("UPDATE BRANCHES");
      setIsReady(true);
    };

    _setup();
  }, [isFetching, updateBranches]);

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex flex-wrap flex-row justify-between items-center h-[64px] px-5 container !bg-[#F4F4F5] border-solid border-[#E7E7F1] border-0 border-b-[1px]">
        <h1 className="flex flex-wrap flex-row justify-start items-center">
          <Link
            to={`/o/${daoName}`}
            className="font-semibold text-xl color flex flex-row justify-start items-center text-[#0083E0]"
          >
            <div className="w-[40px] h-[40px] border shadow-md border-none bg-white rounded-lg overflow-hidden mr-2">
              <img
                src={getIdenticonAvatar({ seed: daoName }).toDataUriSync()}
                className="w-full"
                alt=""
              />
            </div>{" "}
            {daoName}
          </Link>
          {/* <span className="ml-2 align-super text-sm font-normal">
          {dao.details?.version}
        </span> */}

          <span className="mx-2">/</span>

          <div
            // to={`/o/${daoName}/r/${repoName}`}
            className="font-semibold text-xl"
          >
            {repoName}
          </div>
          {/* <span className="ml-2 align-super text-sm font-normal">
          {repository.details?.version}
        </span> */}
        </h1>
        <CopyClipboard
          className="w-fit text-[14px] text-[#808390]"
          label={
            <span
              data-tooltip-id="common-tip"
              data-tooltip-content="DAO address"
            >
              {shortString(account?.address || "")}
            </span>
          }
          componentProps={{
            text: account?.address || "",
          }}
        />
      </div>

      {!isReady && (
        <Loader className="container py-4">Loading repository...</Loader>
      )}
      {isReady && (
        <>
          {Boolean(getTabs().length) && (
            <div
              className={classNames(
                "flex gap-x-9 overflow-x-auto no-scrollbar container",
                "border-b border-b-gray-d6d9e1 container",
              )}
            >
              {getTabs().map((item, index) => (
                <NavLink
                  key={index}
                  to={item.to}
                  end={index === 0}
                  className={({ isActive }) =>
                    classNames(
                      "py-2 text-gray-7c8db5 font-medium whitespace-nowrap",
                      "border-b-4 border-b-transparent",
                      "hover:border-black hover:text-black",
                      isActive ? "!border-black text-black" : null,
                    )
                  }
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    size="sm"
                    className="mr-2"
                  />
                  {item.title}
                </NavLink>
              ))}
            </div>
          )}

          <div>
            {repository.details?.commitsIn.map(({ branch, commit }, index) => (
              <div
                key={index}
                className="bg-amber-400 rounded-2xl px-4 py-2 mb-2 last:mb-6 container"
              >
                <Spinner size="sm" className="mr-3" />
                <span className="text-sm">
                  Repository is processing incoming commit
                  <span className="font-bold mx-1">
                    {shortString(commit.name, 7, 0, "")}
                  </span>
                  into branch
                  <span className="font-bold mx-1">{branch}</span>
                </span>
              </div>
            ))}
          </div>

          <Outlet context={{ dao, repository }} />
        </>
      )}
    </div>
  );
};

export default withPin(RepoLayout, { redirect: false });
