import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import Spinner from '../../components/Spinner'
import {
    githubRepositoriesAtom,
    githubRepositoriesSelector,
    octokitSelector,
    signupStepAtom,
} from '../../store/signup.state'

type TGithubRepositoriesProps = {
    organization: any
}

const GithubRepositories = (props: TGithubRepositoriesProps) => {
    const { organization } = props
    const setGithubRepos = useSetRecoilState(githubRepositoriesAtom)
    const githubOrgRepos = useRecoilValue(githubRepositoriesSelector(organization.id))
    const octokit = useRecoilValue(octokitSelector)
    const setStep = useSetRecoilState(signupStepAtom)

    const onRepositoryCheck = (id: number) => {
        setGithubRepos((state) => ({
            ...state,
            [organization.id]: {
                ...state[organization.id],
                items: state[organization.id].items.map((item) => {
                    if (item.id !== id) return item
                    return { ...item, isSelected: !item.isSelected }
                }),
            },
        }))
    }

    const getGithubRepositories = useCallback(async () => {
        if (!octokit) return

        setGithubRepos((state) => ({
            ...state,
            [organization.id]: {
                ...state[organization.id],
                items: state[organization.id]?.items || [],
                isFetching: true,
            },
        }))

        const { data } = organization.isUser
            ? await octokit.request(
                  'GET /user/repos{?visibility,affiliation,type,sort,direction,per_page,page,since,before}',
                  {
                      visibility: 'public',
                      affiliation: 'owner',
                  },
              )
            : await octokit.request(
                  'GET /orgs/{org}/repos{?type,sort,direction,per_page,page}',
                  {
                      org: organization.login,
                      type: 'public',
                  },
              )

        setGithubRepos((state) => ({
            ...state,
            [organization.id]: {
                ...state[organization.id],
                items: data.map((item: any) => {
                    const exists = state[organization.id].items.find(
                        (a) => a.id === item.id,
                    )
                    if (exists) return exists
                    return { ...item, isSelected: false }
                }),
                isFetching: false,
            },
        }))
    }, [
        octokit,
        organization.id,
        organization.login,
        organization.isUser,
        setGithubRepos,
    ])

    useEffect(() => {
        getGithubRepositories()
    }, [getGithubRepositories])

    return (
        <div className="signup signup--repositories">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <div className="aside-step__btn-back">
                        <button type="button" onClick={() => setStep({ index: 1 })}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                    </div>
                    <span className="aside-step__title">{organization.login}</span>
                </div>

                <p className="aside-step__text">Select repositories to add to GOSH</p>
            </div>
            <div className="signup__content">
                <div className="signup__reload-items">
                    <button
                        type="button"
                        disabled={githubOrgRepos?.isFetching}
                        onClick={getGithubRepositories}
                    >
                        {githubOrgRepos?.isFetching && <Spinner size="xs" />}
                        Refresh
                    </button>
                </div>

                {!githubOrgRepos?.isFetching && !githubOrgRepos?.items.length && (
                    <div className="signup__norepos">
                        <p className="signup__norepos-title">Nothing to show</p>
                        <p className="signup__norepos-content">
                            You should have at least one repository on GitHub
                        </p>
                    </div>
                )}

                {githubOrgRepos?.items.map((item, index) => (
                    <div
                        key={index}
                        className="signup__repoitem repoitem"
                        onClick={() => onRepositoryCheck(item.id)}
                    >
                        <div className="repoitem__header">
                            <FontAwesomeIcon
                                icon={faHardDrive}
                                className="repoitem__icon"
                            />
                            <div className="repoitem__title">{item.name}</div>
                            <div className="repoitem__check">
                                <input
                                    type="checkbox"
                                    checked={item.isSelected}
                                    onChange={() => {}}
                                />
                            </div>
                        </div>

                        <p className="repoitem__description">{item.description}</p>

                        <p className="repoitem__secondary">
                            Updated on {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default GithubRepositories
