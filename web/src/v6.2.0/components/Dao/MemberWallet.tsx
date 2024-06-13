import classNames from 'classnames'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { appModalStateAtom } from '../../../store/app.state'
import { useDaoMember } from '../../hooks/dao.hooks'
import { BadgeExpertTag } from '../Badge'
import { MemberTokenSendModal } from '../Modal'

type TDaoWalletSideProps = React.HTMLAttributes<HTMLDivElement>

const DaoMemberWallet = (props: TDaoWalletSideProps) => {
  const { className } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const member = useDaoMember()

  const getUserBalance = useCallback(() => {
    if (!member.balance) {
      return 0
    }
    const voting = Math.max(member.balance.voting, member.balance.locked)
    return voting + member.balance.regular
  }, [member.balance])

  const onTokenSendClick = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <MemberTokenSendModal />,
    })
  }

  return (
    <div
      className={classNames(
        'border border-gray-e6edff rounded-xl p-5',
        className,
      )}
    >
      <div>
        <div className="mb-1 text-gray-7c8db5 text-sm">Your wallet balance</div>
        <div className="text-xl font-medium">
          {getUserBalance().toLocaleString()}
        </div>

        {(member.isMember || member.isLimited) && (
          <div className="mt-3 flex flex-wrap gap-x-3">
            <div className="grow">
              <Button
                variant="outline-secondary"
                className="w-full"
                onClick={onTokenSendClick}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>

      <hr className="my-4 bg-gray-e6edff" />
      <div>
        <div className="mb-1 text-gray-7c8db5 text-sm">
          Your vesting balance
        </div>
        <div className="text-xl font-medium">
          {member.vesting ? member.vesting.toLocaleString() : 0}
        </div>
      </div>

      {member.isMember && (
        <>
          <hr className="my-4 bg-gray-e6edff" />
          <div>
            <div className="mb-1 text-gray-7c8db5 text-sm">Your karma</div>
            <div className="text-xl font-medium">
              {member.allowance?.toLocaleString()}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
              {member.expert_tags?.map((tag, index) => (
                <BadgeExpertTag
                  key={index}
                  seed={tag.name}
                  content={`${tag.multiplier}% ${tag.name}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { DaoMemberWallet }
