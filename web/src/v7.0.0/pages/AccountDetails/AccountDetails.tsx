import CopyClipboard from '../../../components/CopyClipboard'
import { shortString } from '../../../utils'
import { BlockInfo } from '../../components/Account'
import { useUser } from '../../hooks/user.hooks'

const AccountDetailsPage = () => {
  const { user } = useUser()

  return (
    <div className="flex flex-col gap-y-8">
      <BlockInfo
        title="My profile name"
        description="Share it with DAO member to add you to members list"
      >
        <CopyClipboard
          className="text-gray-7c8db5 text-sm"
          label={shortString(user.username!, 10, 10)}
          componentProps={{
            text: user.username!,
          }}
        />
      </BlockInfo>
      <BlockInfo title="My profile address">
        <CopyClipboard
          className="text-gray-7c8db5 text-sm"
          label={shortString(user.profile!, 10, 10)}
          componentProps={{
            text: user.profile!,
          }}
        />
      </BlockInfo>
      <BlockInfo title="My public key">
        <CopyClipboard
          className="text-gray-7c8db5 text-sm"
          label={shortString(`0x${user.keys!.public}`, 10, 10)}
          componentProps={{
            text: `0x${user.keys!.public}`,
          }}
        />
      </BlockInfo>
    </div>
  )
}

export default AccountDetailsPage
