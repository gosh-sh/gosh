import { faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect } from 'react'
import { Button, Checkbox } from '../../../../components/Form'
import { TOnboardingOrganization } from '../../../types/onboarding.types'
import ListEmpty from './ListEmpty'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { useOnboardingRepositories } from '../../../hooks/onboarding.hooks'
import Loader from '../../../../components/Loader'

type TGithubRepositoriesProps = {
  organization: TOnboardingOrganization
  isOpen: boolean
  signoutOAuth(): Promise<void>
}

const GithubRepositories = (props: TGithubRepositoriesProps) => {
  const { isOpen, organization, signoutOAuth } = props
  const { repositories, getRepositories, getNext, toggleRepository } =
    useOnboardingRepositories(organization)

  useEffect(() => {
    const _getRepositories = async () => {
      try {
        await getRepositories()
      } catch (e: any) {
        console.error(e.message)
        toast.error(<ToastError error={e} />)
        await signoutOAuth()
      }
    }

    if (isOpen) {
      _getRepositories()
    }
  }, [isOpen, organization.name])

  return (
    <>
      {repositories.isFetching && !repositories.items.length && (
        <Loader className="p-4">Loading respositories...</Loader>
      )}

      {!repositories.isFetching && !repositories.items.length && (
        <ListEmpty>You should have at least one repository on GitHub</ListEmpty>
      )}

      {repositories.items.map((item, index) => (
        <div
          key={index}
          className="p-5 cursor-pointer hover:bg-gray-fafafd"
          onClick={() => toggleRepository(item)}
        >
          <div className="relative flex flex-nowrap items-center font-medium">
            <FontAwesomeIcon icon={faHardDrive} className="mr-2.5" />
            <div className="text-blue-2b89ff whitespace-nowrap text-ellipsis overflow-hidden max-w-[80%]">
              {item.name}
            </div>
            <div className="absolute top-0 right-0 z-10">
              <Checkbox
                checked={!!item.isSelected}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={() => {}}
              />
            </div>
          </div>

          <p className="text-sm text-gray-53596d mt-1.5">{item.description}</p>

          <p className="text-xs text-gray-53596d mt-2.5">
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
          onClick={getNext}
        >
          Load more
        </Button>
      )}
    </>
  )
}

export { GithubRepositories }
