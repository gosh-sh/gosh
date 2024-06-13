import { MemberIcon } from '../Dao'

const UserSelectOption = (props: { data: any }) => {
  const { data } = props
  return (
    <>
      <div>
        <MemberIcon type={data.value.type} size="sm" className="mr-2" />
        {data.label}
      </div>
      {data.hint && (
        <div className="text-[0.7rem] leading-tight mt-1">{data.hint}</div>
      )}
    </>
  )
}

const UserSelectNoOptions = (props: { input: string }) => {
  const { input } = props
  if (input) {
    return 'User not found or has incompatible version'
  }
  return 'Type user or DAO name in search field'
}

const UserSelectIncompatibleHint = (props: { version: string }) => {
  const { version } = props
  return (
    <div className="text-yellow-500/80">
      Incompatible version
      <br />
      Consider upgrading your DAO to version {version}
    </div>
  )
}

UserSelectOption.NoOptions = UserSelectNoOptions
UserSelectOption.IncompatibleHint = UserSelectIncompatibleHint

export { UserSelectOption }
