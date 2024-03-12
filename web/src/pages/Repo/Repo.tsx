import { faFile } from '@fortawesome/free-regular-svg-icons'
import {
  faChevronDown,
  faClockRotateLeft,
  faCode,
  faCodeBranch,
  faFileCirclePlus,
  faFolder,
  faMagnifyingGlass,
  faRightLong,
  faTerminal,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog, Menu, Transition } from '@headlessui/react'
import React, { useEffect } from 'react'
import {
  AppConfig,
  classNames,
  shortString,
  splitByPath,
  useBranches,
  useTree,
} from 'react-gosh'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { BranchSelect } from '../../components/Branches'
import CopyClipboard from '../../components/CopyClipboard'
import { Button, ButtonLink } from '../../components/Form'
import Loader from '../../components/Loader'
import { ModalCloseButton } from '../../components/Modal'
import { onExternalLinkClick } from '../../helpers'
import { appModalStateAtom } from '../../store/app.state'
import {
  ApplicationFormList,
  IssueICToken,
  RepoTokenWallet,
} from '../../v6.3.0/components/Repository'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import RepoReadme from './Readme'

const RepoPage = () => {
  const treepath = useParams()['*'] || ''
  const { daoName, repoName, branchName } = useParams()
  const navigate = useNavigate()
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
  const { branches, branch, updateBranch } = useBranches(repository.adapter, branchName)
  const { subtree, blobs } = useTree(daoName!, repoName!, branch?.commit, treepath)
  const setModal = useSetRecoilState(appModalStateAtom)

  const [dirUp] = splitByPath(treepath)

  const getRemoteUrl = (short: boolean): string => {
    const goshAddress = AppConfig.versions[repository.details.version]
    const goshstr = short ? shortString(goshAddress) : goshAddress
    return `gosh://${goshstr}/${daoName}/${repoName}`
  }

  const openIssueICTokenForm = () => {
    setModal({
      isOpen: true,
      element: (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-lg overflow-clip">
          <ModalCloseButton />
          <IssueICToken
            dao_details={dao.details}
            repo_adapter={repository.adapter}
            repo_metadata={repository.details.metadata!}
          />
        </Dialog.Panel>
      ),
    })
  }

  useEffect(() => {
    if (!branchName) {
      navigate(`/o/${daoName}/r/${repoName}/tree/${repository.details.head}`)
    } else {
      updateBranch(branchName)
    }
  }, [daoName, repoName, branchName, repository.details.head, navigate, updateBranch])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 mb-4">
        <div className="grow flex items-center gap-y-2 gap-x-5">
          <BranchSelect
            branch={branch}
            branches={branches}
            onChange={(selected) => {
              if (selected) {
                navigate(`/o/${daoName}/r/${repoName}/tree/${selected.name}`)
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
        </div>

        <div className="flex grow gap-3 justify-end">
          <ButtonLink
            to={`/o/${daoName}/r/${repoName}/find/${branch?.name}`}
            test-id="link-goto-file"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span className="hidden sm:inline-block ml-2">Go to file</span>
          </ButtonLink>
          {!branch?.isProtected && dao.details.isAuthMember && (
            <ButtonLink
              to={`/o/${daoName}/r/${repoName}/blobs/create/${branch?.name}${
                treepath && `/${treepath}`
              }`}
              test-id="link-file-create"
            >
              <FontAwesomeIcon icon={faFileCirclePlus} />
              <span className="hidden sm:inline-block ml-2">Add file</span>
            </ButtonLink>
          )}
          <Menu as="div" className="relative">
            <Menu.Button as="div">
              <Button test-id="btn-clone-trigger">
                <FontAwesomeIcon icon={faCode} />
                <span className="hidden sm:inline-block ml-2">Clone</span>
                <FontAwesomeIcon icon={faChevronDown} size="xs" className="ml-2" />
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
                        'flex items-center',
                        'border border-gray-0a1124/65 rounded',
                        'text-gray-0a1124/65',
                      )}
                    >
                      <div
                        className={classNames(
                          'overflow-hidden whitespace-nowrap',
                          'text-xs font-mono px-3 py-1',
                        )}
                      >
                        {getRemoteUrl(true)}
                      </div>
                      <CopyClipboard
                        componentProps={{
                          text: getRemoteUrl(false),
                        }}
                        iconContainerClassName={classNames(
                          'px-2 border-l border-gray-0a1124',
                          'hover:text-gray-0a1124',
                        )}
                        iconProps={{ size: 'sm' }}
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
                            'https://docs.gosh.sh/working-with-gosh/git-remote-helper/',
                          )
                        }}
                      >
                        How to setup git remote helper?
                      </a>
                    </div>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      <div
        className={classNames(
          'grid gap-6 grid-cols-1',
          repository.details.metadata?.forms ? 'lg:grid-cols-[1fr_300px]' : 'null',
        )}
      >
        <div>
          {subtree === undefined && <Loader className="text-sm">Loading tree...</Loader>}
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
              const path = [item.path, item.name].filter((part) => part !== '').join('/')
              const type = item.type === 'tree' ? 'tree' : 'blobs/view'

              if (item.type === 'commit') {
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
                )
              }

              return (
                <div key={index} className="py-3">
                  <Link
                    className="hover:underline"
                    to={`/o/${daoName}/r/${repoName}/${type}/${branchName}/${path}`}
                  >
                    <FontAwesomeIcon
                      className="mr-2"
                      icon={item.type === 'tree' ? faFolder : faFile}
                      size="1x"
                      fixedWidth
                    />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                </div>
              )
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

        {dao.details.version >= '6.3.0' &&
          repository.details.metadata?.forms &&
          !repository.details.metadata?.token_issued && (
            <div className="sticky top-3 bg-white border border-gray-e6edff rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">
                {repository.details.metadata.token_issue.ic
                  ? 'IC Application Forms'
                  : 'Application Forms'}
              </h3>
              <ApplicationFormList />

              {repository.details.metadata?.token_issue.ic && (
                <div className="mt-4">
                  <Button className="w-full" onClick={openIssueICTokenForm}>
                    Issue tokens
                  </Button>
                </div>
              )}
            </div>
          )}

        {dao.details.version >= '6.3.0' && repository.details.metadata?.token_issued && (
          <div className="sticky top-3 bg-white border border-gray-e6edff rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Repository token</h3>
            <RepoTokenWallet />
          </div>
        )}
      </div>
    </>
  )
}

export default RepoPage
