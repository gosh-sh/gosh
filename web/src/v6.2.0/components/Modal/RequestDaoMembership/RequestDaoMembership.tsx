import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import Alert from '../../../../components/Alert'
import { Button } from '../../../../components/Form'
import { FormikTextarea } from '../../../../components/Formik'
import Loader from '../../../../components/Loader'
import { ModalCloseButton } from '../../../../components/Modal'
import { PERSIST_REDIRECT_KEY } from '../../../../constants'
import { appModalStateAtom } from '../../../../store/app.state'
import { useCreateDaoMember, useDao, useDaoMember } from '../../../hooks/dao.hooks'
import { useUser } from '../../../hooks/user.hooks'
import { EDaoMemberType } from '../../../types/dao.types'
import yup from '../../../yup-extended'

type TFormValues = {
  comment: string
}

const RequestDaoMembershipModal = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const { user } = useUser()
  const dao = useDao()
  const member = useDaoMember()
  const { createMember } = useCreateDaoMember()
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [deeplink, setDeeplink] = useState<string>('')

  const disabled = !dao.details.isAskMembershipOn || !member.isReady || member.isMember
  const is_fetching =
    dao.isFetching || !dao.details.isReady || (!!user.profile && !member.isReady)

  const onModalReset = () => {
    setModal((state) => ({ ...state, element: null, isOpen: false }))
  }

  const onSigninClick = () => {
    localStorage.setItem(PERSIST_REDIRECT_KEY, deeplink)
    onModalReset()
    navigate(`/a/signin/?redirect_to=${deeplink}`)
  }

  const onSignupClick = () => {
    localStorage.setItem(PERSIST_REDIRECT_KEY, deeplink)
    onModalReset()
    navigate(`/a/signup/`)
  }

  const onRequestMembership = async (values: TFormValues) => {
    try {
      setSubmitting(true)
      const { comment } = values
      const { eventaddr } = await createMember(
        [
          {
            user: { name: user.username!, type: EDaoMemberType.User },
            allowance: 0,
            comment,
          },
        ],
        true,
      )
      onModalReset()
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const relative = `/o/${dao.details.name}#request-membership`
    setDeeplink(relative)
  }, [dao.details.name])

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <ModalCloseButton disabled={submitting} />
      <Dialog.Title className="mb-8 text-3xl text-center font-medium">
        Request membership
      </Dialog.Title>

      {is_fetching && <Loader className="text-center">Fetching data, please wait</Loader>}

      {!is_fetching && !dao.details.isAskMembershipOn && (
        <Alert variant="danger" className="mb-4">
          <h1 className="font-medium">Request membership is disabled</h1>
          <p className="mt-1 text-xs">
            DAO has disabled request membership, you should contact one of the DAO members
            to ask to invite you
          </p>
        </Alert>
      )}

      {!is_fetching && member.isMember && (
        <Alert variant="danger" className="mb-4">
          <h1 className="font-medium">Already a DAO member</h1>
          <p className="mt-1 text-xs">You are already a member of this DAO</p>
        </Alert>
      )}

      {!is_fetching && !user.profile && (
        <div>
          You should{' '}
          <Button
            variant="custom"
            className="!p-0 !text-base text-blue-2b89ff"
            onClick={onSigninClick}
          >
            sign in
          </Button>{' '}
          if you already have GOSH account or{' '}
          <Button
            variant="custom"
            className="!p-0 !text-base text-blue-2b89ff"
            onClick={onSignupClick}
          >
            sign up
          </Button>{' '}
          to create account and request membership
        </div>
      )}

      {!is_fetching && user.profile && (
        <Formik
          initialValues={{ comment: '' }}
          onSubmit={onRequestMembership}
          validationSchema={yup.object().shape({
            comment: yup.string().required(),
          })}
        >
          {({ isSubmitting }) => (
            <Form>
              <div>
                <Field
                  name="comment"
                  component={FormikTextarea}
                  disabled={isSubmitting || disabled}
                  autoComplete="off"
                  placeholder="Write description of your request to DAO membership"
                  maxRows={5}
                />
              </div>
              <div className="mt-4">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting || is_fetching}
                  disabled={isSubmitting || disabled}
                >
                  {is_fetching ? 'Fetching data' : 'Create proposal'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </Dialog.Panel>
  )
}

export { RequestDaoMembershipModal }
