import { useEffect } from 'react'
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

const GithubOrganizations = () => {
    const githubSession = useRecoilValue(githubSessionAtom)
    const [githubOrgs, setGithubOrgs] = useRecoilState(githubOrganizationsAtom)
    const githubRepos = useRecoilValue(githubRepositoriesAtom)
    const githubReposSelected = useRecoilValue(githubRepositoriesSelectedSelector)
    const octokit = useRecoilValue(octokitSelector)
    const setStep = useSetRecoilState(signupStepAtom)

    useEffect(() => {
        const _getGithubOrganizations = async () => {
            if (!octokit || !githubSession.session) return

            setGithubOrgs((state) => ({ ...state, isFetching: true }))
            const { data } = await octokit.request('GET /user/orgs{?per_page,page}', {})
            const combined = [
                {
                    id: githubSession.session.user.id,
                    login: githubSession.session.user.user_metadata.user_name,
                    isUser: true,
                },
                ...data.map((item: any) => ({ ...item, isUser: false })),
            ]
            setGithubOrgs((state) => {
                const items = combined.map((item: any) => {
                    const exists = state.items.find(
                        (curr: any) => curr.login === item.login,
                    )
                    return exists || item
                })
                return { items, isFetching: false }
            })
        }

        _getGithubOrganizations()
    }, [octokit, githubSession.session, setGithubOrgs])

    return (
        <div>
            {githubOrgs.isFetching && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Loading oranizations...
                </div>
            )}

            {!githubOrgs.isFetching && !githubOrgs.items.length && (
                <div>You have no organizations on Github</div>
            )}

            {githubOrgs.items.map((item, index) => (
                <div key={index}>
                    <button
                        type="button"
                        onClick={() => {
                            setStep({ index: 2, data: { organization: item } })
                        }}
                    >
                        {item.login}
                    </button>

                    <div className="flex text-gray-606060 text-xs gap-x-4">
                        {githubRepos[item.id]?.items
                            .filter((item) => item.isSelected)
                            .map((item, index) => (
                                <div key={index}>{item.name}</div>
                            ))}
                    </div>
                </div>
            ))}

            <button
                type="button"
                className="btn btn--body py-3 px-5 text-xl leading-normal"
                onClick={() => setStep({ index: 3 })}
                disabled={!githubReposSelected.length}
            >
                Continue
            </button>
        </div>
    )
}

export default GithubOrganizations
