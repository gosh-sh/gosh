import { Field, Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { FormikInput, FormikSlider, FormikTextarea } from '../../../../components/Formik'
import { useCreateTask, useDao } from '../../../hooks/dao.hooks'
import { useCreateICFlow } from '../../../hooks/ic.hooks'
import { EICCreateStep } from '../../../types/ic.types'
import yup from '../../../yup-extended'

type TFormValues = {
  name: string
  reward: string
  scientist: string
  issuer: string
  lock: string
  vesting: string
  comment: string
}

const Rewards = () => {
  const dao = useDao()
  const { getTokenAmount } = useCreateTask()
  const { state, setStep, submitRewards } = useCreateICFlow()

  const onBackClick = () => {
    setStep(EICCreateStep.ROLES)
  }

  const onFormSubmit = (values: TFormValues) => {
    submitRewards({
      name: values.name,
      reward: parseInt(values.reward),
      scientist: parseInt(values.scientist),
      issuer: parseInt(values.issuer),
      lock: parseInt(values.lock),
      vesting: parseInt(values.vesting),
      comment: values.comment,
    })
  }

  return (
    <div className="max-w-md mx-auto">
      <h4>Rewards</h4>

      <Formik
        initialValues={{
          name: state.task?.name || '',
          reward: state.task?.reward.toString() || '0',
          scientist: state.task?.scientist.toString() || '60',
          issuer: state.task?.issuer.toString() || '40',
          lock: state.task?.lock.toString() || '0',
          vesting: state.task?.vesting.toString() || '0',
          comment: state.task?.comment || '',
        }}
        validationSchema={yup.object().shape({
          name: yup.string().required(),
          reward: yup
            .number()
            .integer()
            .positive()
            .max(dao.details.supply?.reserve || 0)
            .required(),
          scientist: yup
            .number()
            .test('test-percent', 'Percent sum should be 100%', function (value) {
              if (value + this.parent.issuer !== 100) {
                return false
              }
              return true
            }),
          issuer: yup
            .number()
            .test('test-percent', 'Percent sum should be 100%', function (value) {
              if (value + this.parent.scientist !== 100) {
                return false
              }
              return true
            }),
          comment: yup.string().required(),
        })}
        enableReinitialize
        onSubmit={onFormSubmit}
      >
        {({ values: { reward, scientist, issuer }, isSubmitting }) => (
          <Form>
            <div>
              <Field
                component={FormikInput}
                label="Task name"
                name="name"
                placeholder="Task name"
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>

            <div className="mt-4">
              <Field
                component={FormikInput}
                label="Task reward"
                placeholder="Task reward"
                name="reward"
                autoComplete="off"
                help={`Available DAO reserve ${dao.details.supply?.reserve.toLocaleString()}`}
                disabled={isSubmitting}
              />
            </div>

            <div className="mt-14">
              <h3 className="font-medium">Default task tokens distribution</h3>

              <div className="flex flex-col gap-y-6">
                <div>
                  <Field
                    component={FormikSlider}
                    label="Scientist"
                    name="scientist"
                    inputProps={{ label: '%' }}
                    help={
                      <span>
                        Scientist part:{' '}
                        {getTokenAmount(parseInt(reward), parseInt(scientist))}
                      </span>
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Field
                    component={FormikSlider}
                    label="Issuer"
                    name="issuer"
                    inputProps={{ label: '%' }}
                    help={
                      <span>
                        Issuer part: {getTokenAmount(parseInt(reward), parseInt(issuer))}
                      </span>
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="mt-14">
              <h3 className="font-medium">Vesting and lock</h3>
              <div className="flex flex-col gap-y-6">
                <div>
                  <Field
                    component={FormikSlider}
                    label="Lock period (cliff)"
                    name="lock"
                    inputProps={{ label: ' mo' }}
                    max={12}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Field
                    component={FormikSlider}
                    label="Vesting period"
                    name="vesting"
                    inputProps={{ label: ' mo' }}
                    max={60}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="mt-14">
              <div>
                <Field
                  component={FormikTextarea}
                  label="Comment"
                  name="comment"
                  placeholder="Write a description of the rules of token distribution"
                  maxRows={5}
                  disabled={isSubmitting}
                />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline-secondary"
                  disabled={isSubmitting}
                  onClick={onBackClick}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="ml-auto"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  Next
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export { Rewards }
