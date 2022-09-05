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

        // // Deploy tree
        // // {
        // //     "functionName": "deployTree",
        // //     "input": {
        // //         "repoName": "repo",
        // //         "shaTree": "b39954843ff6e09ec3aa2b942938c30c6bd1629e",
        // //         "datatree": {
        // //             "0xf094c4df7d4e19775b9cc4b1f74317adf5559a5d66b280411be91a18ab33d4b5": {
        // //                 "flags": "2",
        // //                 "mode": "100644",
        // //                 "typeObj": "blob",
        // //                 "name": "a",
        // //                 "sha1": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        // //                 "sha256": "0x0d8b99522ffa09a6c3d9d25025f759acd6261159dec1c6754048fc17d9a3c386"
        // //             }
        // //         },
        // //         "ipfs": null
        // //     }
        // // }
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

        // // Deploy commit
        // // {
        // //     "functionName": "deployCommit",
        // //     "input": {
        // //         "repoName": "repo",
        // //         "branchName": "main",
        // //         "commitName": "6e0fab95a305334a25cc80fa7464e49cc92be690",
        // //         "fullCommit": "tree b39954843ff6e09ec3aa2b942938c30c6bd1629e\nauthor 7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8 <7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8@gosh.sh> 1662225047 +0300\ncommitter 7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8 <7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8@gosh.sh> 1662225047 +0300\n\nCreate a",
        // //         "parents": [
        // //             "0:079bcdd1eccf8cc662111669ead0eb2553f0507b8de16e83798b4107f3f1b5fc"
        // //         ],
        // //         "tree": "0:8e04ed08e7a974d659ac0ed08f40fb6ffaa080a8e45091043d2671272b14c8cf",
        // //         "upgrade": false
        // //     }
        // // }
        // await wallet.deployCommit(
        //     repo,
        //     branch,
        //     '6e0fab95a305334a25cc80fa7464e49cc92be690',
        //     'tree b39954843ff6e09ec3aa2b942938c30c6bd1629e\nauthor 7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8 <7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8@gosh.sh> 1662225047 +0300\ncommitter 7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8 <7389d5f8218667cddeef649b38ad34404b615324a49b3a8872287e38f93db5e8@gosh.sh> 1662225047 +0300\n\nCreate a',
        //     [],
        //     treeAddr,
        //     true,
        //     [],
        // )

        // // Deploy snapshot
        // // {
        // //     "functionName": "deployNewSnapshot",
        // //     "input": {
        // //         "branch": "main",
        // //         "commit": "",
        // //         "repo": "0:91bc8aa7d4575ce5a9a8fa22eca9fb74b27d3a4777cdf7b4cbd3864cec79b29b",
        // //         "name": "a",
        // //         "snapshotdata": "",
        // //         "snapshotipfs": null
        // //     }
        // // }
        // const compressed = await zstd.compress(AppConfig.goshclient, 'a')
        // const snapdata = Buffer.from(compressed, 'base64').toString('hex')
        // await wallet.deployNewSnapshot(
        //     repo.address,
        //     'main',
        //     '6e0fab95a305334a25cc80fa7464e49cc92be690',
        //     'a',
        //     snapdata,
        //     null,
        // )

        // // Set commit
        // // {
        // //     "repoName": "repo",
        // //     "branchName": "main",
        // //     "commit": "6e0fab95a305334a25cc80fa7464e49cc92be690",
        // //     "numberChangedFiles": 1
        // // }
        // await wallet.setCommit(
        //     'repo',
        //     'main',
        //     '6e0fab95a305334a25cc80fa7464e49cc92be690',
        //     1,
        // )
    }

    useEffect(() => {
        if (branch?.name) updateBranch(branch.name)
    }, [branch?.name, updateBranch])

    return (
        <div className="bordered-block px-7 py-8">
            <div>
                <button onClick={onUpgrade}>Upgrade</button>
            </div>
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
                    {!branch?.isProtected && wallet?.isDaoParticipant && (
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
                                        to={`/${daoName}/${repoName}/${type}/${branchName}/${path}`}
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
