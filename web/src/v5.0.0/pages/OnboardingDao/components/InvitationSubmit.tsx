import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import yup from '../../../yup-extended'
import { FormikTextarea } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useDao, useDaoInviteList, useDaoMember } from '../../../hooks/dao.hooks'
import classNames from 'classnames'
import Alert from '../../../../components/Alert/Alert'

type TDaoInvitationSubmitProps = {
  username: string
  tokenId: string
}

const DaoInvitationSubmit = (props: TDaoInvitationSubmitProps) => {
  const { username, tokenId } = props
  const navigate = useNavigate()
  const dao = useDao()
  const member = useDaoMember()
  const { create } = useDaoInviteList()

  const onFormSubmit = async (values: { comment: string }) => {
    try {
      const { comment } = values
      await create({ id: tokenId, token: '', username, allowance: 0, comment })
      navigate(`/o/${dao.details.name}/events`)
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-6 items-center mb-8">
        <div>
          <h3 className="text-xl font-medium">Submit invitation</h3>
        </div>
      </div>

      <div
        className={classNames(
          'w-full lg:w-1/2 p-5',
          'border border-gray-e6edff rounded-xl',
        )}
      >
        <Formik
          initialValues={{ comment: '' }}
          onSubmit={onFormSubmit}
          validationSchema={yup.object().shape({
            comment: yup.string().required(),
          })}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="mb-3">
                <Field
                  name="comment"
                  component={FormikTextarea}
                  autoComplete="off"
                  placeholder="Input short comment about who you are"
                  maxRows={5}
                  disabled={isSubmitting || !dao.details.isAskMembershipOn}
                />
              </div>

              <div className="mt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting || !dao.details.isAskMembershipOn || !member.isReady
                  }
                  isLoading={isSubmitting}
                >
                  Accept invitation
                </Button>
              </div>

              {!dao.details.isAskMembershipOn && (
                <Alert variant="danger" className="mt-2 text-xs">
                  DAO request membership is disabled for now
                  <br />
                  You can continue after this option will be enabled
                </Alert>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </>
  )
}

export default DaoInvitationSubmit
