import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { Link } from 'react-router-dom'
import { Button, Checkbox, Input } from '../../../../components/Form'
import Skeleton from '../../../../components/Skeleton'
import { getIdenticonAvatar } from '../../../../helpers'
import { useDaoMember } from '../../../hooks/dao.hooks'
import { useHackathon, useHackathonVoting } from '../../../hooks/hackathon.hooks'
import { THackathonParticipant } from '../../../types/hackathon.types'

const ListItemSkeleton = () => {
  return (
    <Skeleton className="p-4" skeleton={{ height: 40 }}>
      <rect x="0" y="0" rx="6" ry="6" width="30%" height="20" />
      <rect x="0" y="30" rx="4" ry="4" width="180" height="10" />
    </Skeleton>
  )
}

type TRepositoryListItemProps = {
  item: THackathonParticipant
  index: number
}

const ListItem = (props: TRepositoryListItemProps) => {
  const { item, index } = props
  const member = useDaoMember()
  const { hackathon } = useHackathon()
  const { selectAppToApprove, updateAppKarma } = useHackathonVoting()

  const member_karma_added = hackathon?.member_voting_state?.karma_added.find((app) => {
    return app.dao_name === item.dao_name && app.repo_name === item.repo_name
  })

  const onItemToggle = () => {
    selectAppToApprove({
      dao_name: item.dao_name,
      repo_name: item.repo_name,
      is_selected: !item.is_selected,
    })
  }

  const onKarmaButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const action = e.currentTarget.dataset.action

    let karma_dirty = parseInt(member_karma_added?.value_dirty || '0')
    karma_dirty += action === 'plus' ? 1 : -1

    updateAppKarma({
      dao_name: item.dao_name,
      repo_name: item.repo_name,
      value: karma_dirty.toString(),
    })
  }

  const onKarmaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAppKarma({
      dao_name: item.dao_name,
      repo_name: item.repo_name,
      value: e.target.value,
      validate: false,
    })
  }

  const onKarmaInputBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAppKarma({
      dao_name: item.dao_name,
      repo_name: item.repo_name,
      value: e.target.value,
    })
  }

  return (
    <div
      className={classNames(
        'p-4',
        hackathon?.is_voting_created && !item.application ? 'opacity-40' : null,
      )}
    >
      <div className="flex items-center gap-4">
        {member.isMember &&
          hackathon?.is_voting_started &&
          !hackathon?.is_voting_created && (
            <Checkbox
              checked={!!item.is_selected}
              onChange={onItemToggle}
              className="h-[24px]"
            />
          )}
        <div className="grow">
          <div className="flex items-center flex-wrap gap-2">
            {hackathon?.is_voting_finished && (
              <div className="text-xl font-medium pr-3">{index + 1}</div>
            )}
            <div className="w-8">
              <img
                src={getIdenticonAvatar({
                  seed: item.dao_name,
                  radius: 50,
                }).toDataUriSync()}
                alt=""
                className="w-full"
              />
            </div>
            <div>
              <span>{item.dao_name}</span>
              <span className="mx-1">/</span>
              <Link
                className="font-medium text-blue-2b89ff"
                to={`/o/${item.dao_name}/r/${item.repo_name}`}
                target="_blank"
              >
                {item.repo_name}
              </Link>
            </div>
          </div>

          {item.description && (
            <div className="mt-2.5 text-sm text-gray-53596d">{item.description}</div>
          )}
        </div>

        {member.isMember &&
          hackathon?.is_voting_created &&
          !hackathon?.is_voting_finished &&
          !!item.application && (
            <div className="basis-4/12 shrink-0">
              <div className="flex flex-nowrap items-center justify-between gap-x-12">
                <div className="flex flex-nowrap items-center justify-between gap-x-2">
                  <Button
                    data-action="minus"
                    className="block !px-3.5"
                    variant="outline-secondary"
                    onClick={onKarmaButtonClick}
                  >
                    <FontAwesomeIcon icon={faMinus} />
                  </Button>
                  <Input
                    placeholder="Add karma"
                    value={member_karma_added?.value_dirty || ''}
                    onChange={onKarmaInputChange}
                    onBlur={onKarmaInputBlur}
                  />
                  <Button
                    data-action="plus"
                    className="block !px-3.5"
                    variant="outline-secondary"
                    onClick={onKarmaButtonClick}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </Button>
                </div>
              </div>
            </div>
          )}

        {hackathon?.is_voting_finished && (
          <div className="text-3xl font-medium pr-3">
            {item.application?.votes.toLocaleString() || 0}
            <span className="text-sm text-gray-7c8db5 ml-2">votes</span>
          </div>
        )}
      </div>
    </div>
  )
}

export { ListItem, ListItemSkeleton }
