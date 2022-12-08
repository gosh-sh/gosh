import { useCallback, useEffect } from 'react'
import { classNames } from 'react-gosh'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import Spinner from '../../components/Spinner'
import {
    githubOrganizationsAtom,
    githubRepositoriesAtom,
    githubRepositoriesSelectedSelector,
    githubSessionAtom,
    octokitSelector,
    signupStepAtom,
} from '../../store/signup.state'

type TGithubOrganizationsProps = {
    signoutGithub(): Promise<void>
}

const GithubOrganizations = (props: TGithubOrganizationsProps) => {
    const { signoutGithub } = props
    const { session } = useRecoilValue(githubSessionAtom)
    const [githubOrgs, setGithubOrgs] = useRecoilState(githubOrganizationsAtom)
    const githubRepos = useRecoilValue(githubRepositoriesAtom)
    const githubReposSelected = useRecoilValue(githubRepositoriesSelectedSelector)
    const octokit = useRecoilValue(octokitSelector)
    const setStep = useSetRecoilState(signupStepAtom)

    const getGithubOrganizations = useCallback(async () => {
        if (!octokit || !session) return

        setGithubOrgs((state) => ({ ...state, isFetching: true }))
        const { data } = await octokit.request('GET /user/orgs{?per_page,page}', {})
        const combined = [
            {
                id: session.user.id,
                login: session.user.user_metadata.user_name,
                avatar_url: session.user.user_metadata.avatar_url,
                isUser: true,
            },
            ...data.map((item: any) => ({ ...item, isUser: false })),
        ]
        setGithubOrgs((state) => {
            const items = combined.map((item: any) => {
                const exists = state.items.find((curr: any) => curr.login === item.login)
                return exists || item
            })
            return { items, isFetching: false }
        })
    }, [octokit, session, setGithubOrgs])

    useEffect(() => {
        getGithubOrganizations()
    }, [getGithubOrganizations])

    if (!session) return null
    return (
        <div className="flex justify-between items-start pt-36 pb-5">
            <div className="basis-1/2 px-24">
                <div className="text-xl mt-28">
                    Hey, {session.user.user_metadata.name}
                    <button
                        type="button"
                        className="btn btn--body px-2 py-1.5 text-xs ml-2"
                        onClick={signoutGithub}
                    >
                        Signout
                    </button>
                </div>

                <p className="mt-8 mb-14 text-2xl leading-normal font-medium">
                    Select GitHub organization to
                    <span className="text-blue-348eff"> create your DAO on GOSH</span>
                </p>

                <button
                    type="button"
                    className="btn btn--body py-3 px-5 text-base leading-normal font-medium w-9/12"
                    onClick={() => setStep({ index: 3 })}
                    disabled={!githubReposSelected.length}
                >
                    Upload
                </button>
            </div>
            <div className="basis-1/2 px-3">
                <div className="mb-4 text-end">
                    <button
                        type="button"
                        className="btn btn--body text-xs px-2 py-1.5"
                        disabled={githubOrgs.isFetching}
                        onClick={getGithubOrganizations}
                    >
                        {githubOrgs.isFetching && <Spinner className="mr-3" size="xs" />}
                        Refresh
                    </button>
                </div>

                {githubOrgs.items.map((item, index) => {
                    const selected = githubRepos[item.id]?.items
                        .filter((item) => item.isSelected)
                        .map((item, index) => (
                            <span key={index} className="text-blue-348eff px-1">
                                {item.name}
                            </span>
                        ))

                    return (
                        <div
                            key={index}
                            className={classNames(
                                'border rounded-xl p-5 mb-6 flex flex-nowrap cursor-pointer',
                                'hover:bg-gray-50',
                            )}
                            onClick={() => {
                                setStep({
                                    index: 2,
                                    data: { organization: item },
                                })
                            }}
                        >
                            <div className="overflow-hidden">
                                <img
                                    src={item.avatar_url}
                                    className="w-20 h-20 rounded-xl"
                                    alt=""
                                />
                            </div>
                            <div className="pl-4">
                                <div className="text-xl font-medium leading-tight">
                                    {item.login}
                                </div>

                                <p className="text-sm text-gray-53596d">
                                    {item.description}
                                </p>

                                <div className="text-gray-606060 text-xs mt-3">
                                    {selected?.length ? selected : 'Select repository'}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default GithubOrganizations
