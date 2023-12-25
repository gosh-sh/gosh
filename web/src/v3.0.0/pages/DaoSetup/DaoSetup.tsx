import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { useDao, useUpdateDaoSettings } from '../../hooks/dao.hooks'
import { BaseField, FormikCheckbox, FormikTextarea } from '../../../components/Formik'
import { Button } from '../../../components/Form'
import { Select2ClassNames } from '../../../helpers'
import CreatableSelect from 'react-select/creatable'
import yup from '../../yup-extended'
import _ from 'lodash'
import { useCallback } from 'react'
import Alert from '../../../components/Alert'

type TFormValues = {
  tags: string[]
  isMintOn: boolean
  isEventProgressOff: boolean
  isEventDiscussionOn: boolean
  isAskMembershipOn: boolean
  comment: string
}

const DaoSetupPage = () => {
  const navigate = useNavigate()
  const dao = useDao()
  const { update, status } = useUpdateDaoSettings()

  const isDirty = useCallback(
    (values: TFormValues) => {
      const updated = {
        tags: values.tags,
        isMintOn: values.isMintOn,
        isEventProgressOn: !values.isEventProgressOff,
        isEventDiscussionOn: values.isEventDiscussionOn,
        isAskMembershipOn: values.isAskMembershipOn,
      }
      const initial = {
        tags: dao.details.tags,
        isMintOn: dao.details.isMintOn,
        isEventProgressOn: dao.details.isEventProgressOn,
        isEventDiscussionOn: dao.details.isEventDiscussionOn,
        isAskMembershipOn: dao.details.isAskMembershipOn,
      }
      return !_.isEqual(updated, initial)
    },
    [
      dao.details.tags,
      dao.details.isMintOn,
      dao.details.isEventProgressOn,
      dao.details.isEventDiscussionOn,
      dao.details.isAskMembershipOn,
    ],
  )

  const onSubmit = async (values: TFormValues) => {
    try {
      const { isEventProgressOff, ...rest } = values
      await update({ isEventProgressOn: !isEventProgressOff, ...rest })
      navigate(`/o/${dao.details.name}/events`)
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Formik
      initialValues={{
        tags: dao.details.tags || [],
        isMintOn: !!dao.details.isMintOn,
        isEventProgressOff: !dao.details.isEventProgressOn,
        isEventDiscussionOn: !!dao.details.isEventDiscussionOn,
        isAskMembershipOn: !!dao.details.isAskMembershipOn,
        comment: '',
      }}
      validationSchema={yup.object().shape({
        tags: yup.array().of(yup.string()).max(3),
        comment: yup.string().required(),
      })}
      enableReinitialize
      onSubmit={onSubmit}
    >
      {({ isSubmitting, values, setFieldValue }) => (
        <Form>
          <div>
            <h3 className="text-xl font-medium mb-10">Tags</h3>
            <div>
              <Field name="tags" component={BaseField}>
                <CreatableSelect
                  isMulti
                  isClearable
                  value={values.tags?.map((v) => ({
                    label: v,
                    value: v,
                  }))}
                  openMenuOnClick={false}
                  classNames={Select2ClassNames}
                  placeholder="Theme tags (up to 3 tags)"
                  isDisabled={isSubmitting}
                  onChange={(option) => {
                    const items = option.map((item: any) => item.value)
                    setFieldValue('tags', items, true)
                  }}
                  test-id="input-dao-tags"
                />
              </Field>
            </div>
          </div>
          <hr className="my-16 bg-gray-e6edff" />
          <div>
            <h3 className="text-xl font-medium mb-10">Token setup</h3>
            <div>
              <Field
                type="checkbox"
                label="Allow mint"
                name="isMintOn"
                component={FormikCheckbox}
                disabled={isSubmitting || !dao.details.isMintOn}
                inputProps={{
                  className: 'inline-block',
                  label: 'Allow mint',
                }}
                help="This option enables the DAO token mint"
              />
              {!values.isMintOn && (
                <Alert variant="danger" className="mt-2 text-xs">
                  If you uncheck this option the DAO token supply will be capped to{' '}
                  {dao.details.supply?.total.toLocaleString()}
                </Alert>
              )}
            </div>
          </div>
          <hr className="my-16 bg-gray-e6edff" />
          <div>
            <h3 className="text-xl font-medium mb-10">Event setup</h3>
            <div className="flex flex-col gap-y-8">
              <div>
                <Field
                  type="checkbox"
                  name="isEventProgressOff"
                  component={FormikCheckbox}
                  disabled={isSubmitting}
                  inputProps={{
                    label: "Hide voting results until it's over",
                  }}
                />
              </div>
              <div>
                <Field
                  type="checkbox"
                  name="isEventDiscussionOn"
                  component={FormikCheckbox}
                  disabled={isSubmitting}
                  inputProps={{
                    label: 'Allow discussions on events',
                  }}
                />
              </div>
            </div>
          </div>
          <hr className="my-16 bg-gray-e6edff" />
          <div>
            <h3 className="text-xl font-medium mb-10">Members setup</h3>
            <div>
              <Field
                type="checkbox"
                name="isAskMembershipOn"
                component={FormikCheckbox}
                disabled={isSubmitting}
                inputProps={{
                  label: 'Allow external users to request DAO membership',
                }}
              />
            </div>
          </div>
          <hr className="my-16 bg-gray-e6edff" />
          <div>
            <h3 className="text-xl font-medium mb-4">Save changes</h3>
            <div>
              <Field
                name="comment"
                component={FormikTextarea}
                disabled={isSubmitting}
                placeholder="Leave your comment"
                maxRows={5}
              />
            </div>
            <div className="mt-4">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting || !isDirty(values)}
              >
                Save changes and create proposal
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default DaoSetupPage
