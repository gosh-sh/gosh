import { useCallback, useEffect } from 'react'
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
        <div className="signup signup--organizations">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <div className="aside-step__title">
                        Hey, {session.user.user_metadata.name}
                    </div>
                    <div className="aside-step__btn-signout">
                        <button type="button" onClick={signoutGithub}>
                            Signout
                        </button>
                    </div>
                </div>

                <p className="aside-step__text">
                    Select GitHub organization to
                    <span className="aside-step__text-blue">
                        &nbsp;create your DAO on GOSH
                    </span>
                </p>

                <button
                    type="button"
                    className="aside-step__btn-upload"
                    onClick={() => setStep({ index: 3 })}
                    disabled={!githubReposSelected.length}
                >
                    Upload
                </button>
            </div>
            <div className="signup__content">
                <div className="signup__reload-items">
                    <button
                        type="button"
                        disabled={githubOrgs.isFetching}
                        onClick={getGithubOrganizations}
                    >
                        {githubOrgs.isFetching && <Spinner size="xs" />}
                        Refresh
                    </button>
                </div>

                {githubOrgs.items.map((item, index) => {
                    const selected = githubRepos[item.id]?.items
                        .filter((item) => item.isSelected)
                        .map((item, index) => (
                            <span key={index} className="orgitem__repo">
                                {item.name}
                            </span>
                        ))

                    return (
                        <div
                            key={index}
                            className="signup__orgitem orgitem"
                            onClick={() => {
                                setStep({
                                    index: 2,
                                    data: { organization: item },
                                })
                            }}
                        >
                            <div className="orgitem__main">
                                <div className="orgitem__media">
                                    <img src={item.avatar_url} alt="" />
                                </div>
                                <div className="orgitem__content">
                                    <div className="orgitem__header">
                                        <div className="orgitem__title">{item.login}</div>
                                        <div className="orgitem__arrow">
                                            <i className="icon-arrow"></i>
                                        </div>
                                    </div>

                                    <p className="orgitem__description">
                                        {item.description}
                                    </p>

                                    <div className="orgitem__repos">
                                        {selected?.length
                                            ? selected
                                            : 'Select repository'}
                                    </div>
                                </div>
                            </div>
                            <div className="orgitem__repos orgitem__repos--xs">
                                {selected?.length ? selected : 'Select repository'}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default GithubOrganizations
