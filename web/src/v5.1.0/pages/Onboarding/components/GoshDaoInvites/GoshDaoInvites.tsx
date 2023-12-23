import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect } from 'react'
import Spinner from '../../../../../components/Spinner'
import ListEmpty from '../ListEmpty'
import { TOAuthSession } from '../../../../types/oauth.types'
import OAuthProfile from '../OAuthProfile'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import { useOnboardingData } from '../../../../hooks/onboarding.hooks'
import { Button } from '../../../../../components/Form'
import DaoInviteListItem from './ListItem'

type TGoshDaoInvitesProps = {
  oauth: TOAuthSession
  signoutOAuth(): Promise<void>
}

const GoshDaoInvites = (props: TGoshDaoInvitesProps) => {
  const { oauth, signoutOAuth } = props
  const { invites, getDaoInvites, updateData } = useOnboardingData(oauth)

  const onContinueClick = () => {
    updateData({ step: 'organizations' })
  }

  useEffect(() => {
    const _getDaoInvites = async () => {
      try {
        const hasItems = await getDaoInvites()
        if (!hasItems) {
          onContinueClick()
        }
      } catch (e: any) {
        console.error(e.message)
        toast.error(<ToastError error={e} />)
        onContinueClick()
      }
    }
    _getDaoInvites()
  }, [])

  if (!oauth.session) {
    return null
  }
  return (
    <div className="flex flex-wrap items-start">
      <div className="basis-1/2 p-0 lg:p-16">
        <div className="mb-6">
          <OAuthProfile oauth={oauth} onSignout={signoutOAuth} />
        </div>
        <div className="mb-8 text-3xl font-medium">
          Accept or decline invitations to the DAO
        </div>
        <div className="text-center">
          <Button
            type="button"
            size="xl"
            onClick={onContinueClick}
            disabled={!!invites.items.filter((i) => i.accepted === null).length}
          >
            Next step
          </Button>
        </div>
      </div>
      <div className="grow basis-0">
        <div className="text-end text-gray-7c8db5">
          <Button
            type="button"
            variant="custom"
            disabled={invites.isFetching}
            onClick={getDaoInvites}
          >
            {invites.isFetching ? (
              <Spinner size="xs" className="icon" />
            ) : (
              <FontAwesomeIcon icon={faRotateRight} className="icon" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {!invites.isFetching && !invites.items.length && (
          <ListEmpty>You have no pending invites to DAOs on GOSH</ListEmpty>
        )}

        <div className="flex flex-col gap-6">
          {invites.items.map((item, index) => (
            <DaoInviteListItem key={index} oauth={oauth} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default GoshDaoInvites
