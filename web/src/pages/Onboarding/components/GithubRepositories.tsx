import { faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { Button, Checkbox } from '../../../components/Form'
import Spinner from '../../../components/Spinner'
import {
    octokitSelector,
    onboardingDataAtom,
    repositoriesSelector,
} from '../../../store/onboarding.state'
import {
    TOnboardingOrganization,
    TOnboardingRepository,
} from '../../../store/onboarding.types'
import ListEmpty from './ListEmpty'
import _ from 'lodash'

type TGithubRepositoriesProps = {
    organization: TOnboardingOrganization
    isOpen: boolean
    signoutOAuth(): Promise<void>
}

const GithubRepositories = (props: TGithubRepositoriesProps) => {
    const { isOpen, organization, signoutOAuth } = props
    const octokit = useRecoilValue(octokitSelector)
    const setData = useSetRecoilState(onboardingDataAtom)
    const [repositories, setRepositories] = useRecoilState(
        repositoriesSelector(organization.id),
    )

    const onRepositoryClick = (item: TOnboardingRepository) => {
        setRepositories((state) => ({
            ...state,
            items: state.items.map((s) => {
                if (s.id !== item.id) {
                    return s
                }
                return { ...item, isSelected: !item.isSelected }
            }),
        }))
    }

    const onLoadMoreClick = () => {
        setData((state) => ({
            ...state,
            organizations: {
                ...state.organizations,
                items: state.organizations.items.map((o) => {
                    if (o.id !== organization.id) {
                        return o
                    }

                    const page = o.repositories.page || 1
                    return { ...o, repositories: { ...o.repositories, page: page + 1 } }
                }),
            },
        }))
    }

    const getRepositories = useCallback(
        async (page: number = 1, per_page: number = 30) => {
            if (!octokit || !isOpen) {
                return
            }

            setRepositories((state) => ({ ...state, isFetching: true }))
            try {
                const { data } = organization.isUser
                    ? await octokit.request(
                          'GET /user/repos{?visibility,affiliation,type,sort,direction,per_page,page,since,before}',
                          {
                              visibility: 'public',
                              affiliation: 'owner',
                              page,
                              per_page,
                          },
                      )
                    : await octokit.request(
                          'GET /orgs/{org}/repos{?type,sort,direction,per_page,page}',
                          {
                              org: organization.name,
                              type: 'public',
                              page,
                              per_page,
                          },
                      )

                const items = data.map((item: any) => ({
                    daoName: organization.name,
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    updatedAt: item.updated_at,
                }))
                setRepositories((state) => {
                    const different = _.differenceWith(
                        items,
                        state.items,
                        (a: any, b: any) => a.id === b.id,
                    ).map((item) => ({ ...item, isSelected: false }))
                    const intersect = _.intersectionWith(
                        items,
                        state.items,
                        (a: any, b: any) => a.id === b.id,
                    )

                    return {
                        ...state,
                        items: [...state.items, ...different].map((item: any) => {
                            const found = intersect.find((i) => i.id === item.id)
                            return found || item
                        }),
                        hasNext: items.length >= per_page,
                    }
                })
            } catch (e: any) {
                console.error(e.message)
                await signoutOAuth()
                return
            } finally {
                setRepositories((state) => ({ ...state, isFetching: false }))
            }
        },
        [
            octokit,
            organization.name,
            organization.isUser,
            setRepositories,
            isOpen,
            signoutOAuth,
        ],
    )

    useEffect(() => {
        getRepositories(repositories.page)
    }, [])

    useEffect(() => {
        getRepositories(repositories.page)
    }, [repositories.page])

    return (
        <>
            {repositories.isFetching && !repositories.items.length && (
                <div className="p-5 text-sm text-gray-53596d">
                    <Spinner className="mr-3" />
                    Loading respositories...
                </div>
            )}

            {!repositories.isFetching && !repositories.items.length && (
                <ListEmpty className="!my-12">
                    You should have at least one repository on GitHub
                </ListEmpty>
            )}

            {repositories.items.map((item, index) => (
                <div
                    key={index}
                    className="signup__repoitem repoitem"
                    onClick={() => onRepositoryClick(item)}
                >
                    <div className="repoitem__header">
                        <FontAwesomeIcon icon={faHardDrive} className="repoitem__icon" />
                        <div className="repoitem__title">{item.name}</div>
                        <div className="repoitem__check z-10">
                            <Checkbox
                                checked={!!item.isSelected}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                                onChange={() => {}}
                            />
                        </div>
                    </div>

                    <p className="repoitem__description">{item.description}</p>

                    <p className="repoitem__secondary">
                        Updated on {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                </div>
            ))}

            {repositories.hasNext && (
                <Button
                    type="button"
                    variant="custom"
                    className="w-full !rounded-none !text-gray-7c8db5 !bg-gray-fafafd disabled:opacity-70"
                    disabled={repositories.isFetching}
                    isLoading={repositories.isFetching}
                    onClick={onLoadMoreClick}
                >
                    Load more
                </Button>
            )}
        </>
    )
}

export default GithubRepositories
