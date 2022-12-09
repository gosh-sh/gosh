import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { classNames } from 'react-gosh'
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
        <div className="flex justify-between items-start pt-36 pb-5">
            <div className="basis-1/2 px-24">
                <div className="mt-28">
                    <button
                        type="button"
                        className={classNames(
                            'rounded-full border w-10 h-10 mr-6 text-gray-200',
                            'hover:text-gray-400 hover:bg-gray-50',
                        )}
                        onClick={() => setStep({ index: 1 })}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <span className="text-xl font-medium">{organization.login}</span>
                </div>

                <p className="mt-8 mb-14 text-2xl leading-normal font-medium">
                    Select repositories to add to GOSH
                </p>
            </div>
            <div className="basis-1/2 px-3">
                <div className="mb-4 text-end">
                    <button
                        type="button"
                        className="btn btn--body text-xs px-2 py-1.5"
                        disabled={githubOrgRepos?.isFetching}
                        onClick={getGithubRepositories}
                    >
                        {githubOrgRepos?.isFetching && (
                            <Spinner className="mr-3" size="xs" />
                        )}
                        Refresh
                    </button>
                </div>

                {!githubOrgRepos?.isFetching && !githubOrgRepos?.items.length && (
                    <div className="text-center text-gray-53596d w-1/2 mx-auto mt-28">
                        <p className=" text-xl">Nothing to show</p>
                        <p className="leading-tight mt-2">
                            You should have at least one repository on GitHub
                        </p>
                    </div>
                )}

                {githubOrgRepos?.items.map((item, index) => (
                    <div
                        key={index}
                        className={classNames(
                            'border rounded-xl p-5 mb-6 cursor-pointer',
                            'hover:bg-gray-50',
                        )}
                        onClick={() => onRepositoryCheck(item.id)}
                    >
                        <div className="font-medium relative">
                            <FontAwesomeIcon icon={faHardDrive} className="mr-2.5" />
                            <span className="text-blue-1e7aec">{item.name}</span>

                            <div className="absolute top-0.5 right-0.5">
                                <input
                                    type="checkbox"
                                    checked={item.isSelected}
                                    onChange={() => {}}
                                />
                            </div>
                        </div>

                        <p className="text-sm text-gray-53596d mt-1.5">
                            {item.description}
                        </p>

                        <p className="text-xs text-gray-53596d mt-2.5">
                            Updated on {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default GithubRepositories
