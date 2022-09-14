import React, { useEffect } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import BranchSelect from '../../components/BranchSelect'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faClockRotateLeft,
    faCodeBranch,
    faFolder,
    faMagnifyingGlass,
    faFileCirclePlus,
    faCode,
    faChevronDown,
    faTerminal,
} from '@fortawesome/free-solid-svg-icons'
import { useRecoilValue } from 'recoil'
import { useGoshRepoBranches, useGoshRepoTree } from '../../hooks/gosh.hooks'
import Spinner from '../../components/Spinner'
import { AppConfig, splitByPath, zstd } from 'react-gosh'
import { faFile } from '@fortawesome/free-regular-svg-icons'
import { Menu, Transition } from '@headlessui/react'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'

const RepoPage = () => {
    const treePath = useParams()['*'] || ''
    const { daoName, repoName, branchName = 'main' } = useParams()
    const navigate = useNavigate()
    const { wallet, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { branches, branch, updateBranch } = useGoshRepoBranches(repo, branchName)
    const tree = useGoshRepoTree(repo, branch, treePath)
    const subtree = useRecoilValue(tree.getSubtree(treePath))

    const [dirUp] = splitByPath(treePath)

    const onUpgrade = async () => {
        if (!wallet || !repo || !branch) return
        await repo.load()
        console.debug('Wallet address', wallet.instance.address)

        // Deploy tree
        // {
        //     "functionName": "deployTree",
        //     "input": {
        //         "repoName": "repo-0-1-200",
        //         "shaTree": "b39954843ff6e09ec3aa2b942938c30c6bd1629e",
        //         "datatree": {
        //             "0xf094c4df7d4e19775b9cc4b1f74317adf5559a5d66b280411be91a18ab33d4b5": {
        //                 "flags": "2",
        //                 "mode": "100644",
        //                 "typeObj": "blob",
        //                 "name": "a",
        //                 "sha1": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        //                 "sha256": "0x0d8b99522ffa09a6c3d9d25025f759acd6261159dec1c6754048fc17d9a3c386"
        //             }
        //         },
        //         "ipfs": null
        //     }
        // }
        // await wallet.deployTree(repo, [
        //     {
        //         flags: 2,
        //         mode: '100644',
        //         type: 'blob',
        //         path: '',
        //         name: 'a',
        //         sha1: '2e65efe2a145dda7ee51d1741299f848e5bf752e',
        //         sha256: '0x0d8b99522ffa09a6c3d9d25025f759acd6261159dec1c6754048fc17d9a3c386',
        //     },
        // ])
        const treeAddr = await repo.getTreeAddr(
            'b39954843ff6e09ec3aa2b942938c30c6bd1629e',
        )
        console.debug('Tree addr', treeAddr)

        // Deploy commit
        // {
        //     "functionName": "deployCommit",
        //     "input": {
        //         "repoName": "repo-0-1-200",
        //         "branchName": "main",
        //         "commitName": "8fa2abe02453ee20efb116b5b1807c12a1b73997",
        //         "fullCommit": "tree b39954843ff6e09ec3aa2b942938c30c6bd1629e\nauthor 6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe <6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe@gosh.sh> 1662376239 +0300\ncommitter 6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe <6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe@gosh.sh> 1662376239 +0300\n\nCreate a",
        //         "parents": [
        //             "0:1af0b931f432fd13df1face9406d8c6c2ced2cc22719af7bca7257caf96e0e0d"
        //         ],
        //         "tree": "0:bbba8f56b2a72ada68903079f25069360ace7fb4aef36cafcbc6fd3da98419b6",
        //         "upgrade": false
        //     }
        // }
        // await wallet.deployCommit(
        //     repo,
        //     branch,
        //     '8fa2abe02453ee20efb116b5b1807c12a1b73997',
        //     'tree b39954843ff6e09ec3aa2b942938c30c6bd1629e\nauthor 6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe <6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe@gosh.sh> 1662376239 +0300\ncommitter 6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe <6e62ccb5af238477010c6191f4e2363de013587f80cdf11897c2ee738c8038fe@gosh.sh> 1662376239 +0300\n\nCreate a',
        //     ['0:046d984c691abd96cdc0dbd6e9e1f58133e96bf092e61d74404d17831a4435ac'],
        //     treeAddr,
        //     true,
        //     [],
        // )

        // Deploy snapshot
        // {
        //     "functionName": "deployNewSnapshot",
        //     "input": {
        //         "branch": "main",
        //         "commit": "",
        //         "repo": "0:da466c1717297b41c59cff4c24bbfbd685ef7c385fc1b204c430dabab9a0b94f",
        //         "name": "a",
        //         "snapshotdata": "",
        //         "snapshotipfs": null
        //     }
        // }
        // const compressed = await zstd.compress(AppConfig.goshclient, 'a')
        // const snapdata = Buffer.from(compressed, 'base64').toString('hex')
        // await wallet.deployNewSnapshot(
        //     repo.address,
        //     'main',
        //     '8fa2abe02453ee20efb116b5b1807c12a1b73997',
        //     'a',
        //     snapdata,
        //     null,
        // )

        // Set commit
        // {
        //     "functionName": "setCommit",
        //     "input": {
        //         "repoName": "repo-0-1-200",
        //         "branchName": "main",
        //         "commit": "8fa2abe02453ee20efb116b5b1807c12a1b73997",
        //         "numberChangedFiles": 1
        //     }
        // }
        // await wallet.setCommit(
        //     await repo.getName(),
        //     'main',
        //     '8fa2abe02453ee20efb116b5b1807c12a1b73997',
        //     1,
        // )
    }

    useEffect(() => {
        if (branch?.name) updateBranch(branch.name)
    }, [branch?.name, updateBranch])

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
                <div className="grow flex items-center gap-y-2 gap-x-5">
                    <BranchSelect
                        branch={branch}
                        branches={branches}
                        onChange={(selected) => {
                            if (selected) {
                                navigate(`/${daoName}/${repoName}/tree/${selected.name}`)
                            }
                        }}
                    />

                    <Link
                        to={`/${daoName}/${repoName}/branches`}
                        className="block text-sm text-gray-050a15/65 hover:text-gray-050a15"
                    >
                        <span className="font-semibold">
                            <FontAwesomeIcon icon={faCodeBranch} className="mr-1" />
                            {branches.length}
                        </span>
                        <span className="hidden sm:inline-block ml-1">branches</span>
                    </Link>

                    <Link
                        to={`/${daoName}/${repoName}/commits/${branch?.name}`}
                        className="block text-sm text-gray-050a15/65 hover:text-gray-050a15"
                    >
                        <FontAwesomeIcon icon={faClockRotateLeft} />
                        <span className="hidden sm:inline-block ml-1">History</span>
                    </Link>
                </div>

                <div className="flex grow gap-3 justify-end">
                    <Link
                        to={`/${daoName}/${repoName}/find/${branch?.name}`}
                        className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <span className="hidden sm:inline-block ml-2">Go to file</span>
                    </Link>
                    {!branch?.isProtected && wallet?.details.isDaoMember && (
                        <Link
                            to={`/${daoName}/${repoName}/blobs/create/${branch?.name}${
                                treePath && `/${treePath}`
                            }`}
                            className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                        >
                            <FontAwesomeIcon icon={faFileCirclePlus} />
                            <span className="hidden sm:inline-block ml-2">Add file</span>
                        </Link>
                    )}
                    <Menu as="div" className="relative">
                        <Menu.Button className="btn btn--body text-sm px-4 py-1.5 !font-normal">
                            <FontAwesomeIcon icon={faCode} />
                            <span className="hidden sm:inline-block ml-2">Code</span>
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                size="xs"
                                className="ml-2"
                            />
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
                            <Menu.Items className="dropdown-menu !py-4 max-w-264px sm:max-w-none">
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">
                                        <FontAwesomeIcon
                                            icon={faTerminal}
                                            className="mr-2"
                                        />
                                        Clone
                                    </h3>
                                    <div
                                        className="flex border border-gray-0a1124/65 rounded
                                        items-center text-gray-0a1124/65"
                                    >
                                        <div className="text-xs font-mono px-3 py-1 overflow-hidden whitespace-nowrap">
                                            gosh://
                                            {shortString(
                                                process.env.REACT_APP_GOSH_ADDR ?? '',
                                            )}
                                            /{daoName}/{repoName}
                                        </div>
                                        <CopyClipboard
                                            componentProps={{
                                                text: `gosh://${process.env.REACT_APP_GOSH_ADDR}/${daoName}/${repoName}`,
                                            }}
                                            iconContainerClassName="px-2 border-l border-gray-0a1124 hover:text-gray-0a1124"
                                            iconProps={{
                                                size: 'sm',
                                            }}
                                        />
                                    </div>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>

            <div className="mt-5">
                {subtree === undefined && (
                    <div className="text-gray-606060 text-sm">
                        <Spinner className="mr-3" />
                        Loading tree...
                    </div>
                )}

                {subtree && !subtree?.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no files yet
                    </div>
                )}

                {!!subtree && treePath && (
                    <Link
                        className="block py-3 border-b border-gray-300 font-medium"
                        to={`/${daoName}/${repoName}/tree/${branchName}${
                            dirUp && `/${dirUp}`
                        }`}
                    >
                        ..
                    </Link>
                )}
                <div className="divide-y divide-gray-c4c4c4">
                    {!!subtree &&
                        subtree?.map((item: any, index: number) => {
                            const path = [item.path, item.name]
                                .filter((part) => part !== '')
                                .join('/')
                            const type = item.type === 'tree' ? 'tree' : 'blobs'

                            return (
                                <div key={index} className="py-3">
                                    <Link
                                        className="hover:underline text-sm"
                                        to={`/${daoName}/${repoName}/${type}/view/${branchName}/${path}`}
                                    >
                                        <FontAwesomeIcon
                                            className="mr-2"
                                            icon={
                                                item.type === 'tree' ? faFolder : faFile
                                            }
                                            fixedWidth
                                        />
                                        {item.name}
                                    </Link>
                                </div>
                            )
                        })}
                </div>
            </div>
        </div>
    )
}

export default RepoPage
