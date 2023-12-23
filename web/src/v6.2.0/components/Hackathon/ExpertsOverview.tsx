import { Field, Form, Formik } from 'formik'
import randomColor from 'randomcolor'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { Button } from '../../../components/Form'
import { BaseField } from '../../../components/Formik'
import { Select2ClassNames } from '../../../helpers'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useUpdateHackathon } from '../../hooks/hackathon.hooks'

type TFormValues = {
  expert_tags: { label: string; value: string }[]
}

const HackathonExpertsOverview = () => {
  const navigate = useNavigate()
  const dao = useDao()
  const member = useDaoMember()
  const { hackathon } = useHackathon()
  const { updateMetadata } = useUpdateHackathon()

  const onFormSubmit = async (values: TFormValues) => {
    try {
      const { event_address } = await updateMetadata({
        expert_tags: values.expert_tags.map(({ value }) => value),
      })
      if (event_address) {
        navigate(`/o/${dao.details.name}/events/${event_address}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
      <div className="py-4 w-full flex items-center justify-between border-b border-b-gray-e6edff">
        <div className="font-medium">Expert tags</div>
      </div>

      <Formik
        initialValues={{
          expert_tags:
            hackathon?.expert_tags.map((item: string) => ({
              label: item,
              value: item,
            })) || [],
        }}
        onSubmit={onFormSubmit}
        enableReinitialize
      >
        {({ setFieldValue, isSubmitting, dirty, values }) => (
          <Form className="py-6">
            <Field name="expert_tags" component={BaseField}>
              <Select
                value={values.expert_tags.map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
                options={dao.details.expert_tags?.map((item) => ({
                  label: item.name,
                  value: item.name,
                }))}
                isMulti
                isClearable={false}
                isDisabled={!member.isMember || !hackathon?.is_update_enabled}
                placeholder="Expert tags"
                classNames={{
                  ...Select2ClassNames,
                  valueContainer: () => '!p-1',
                  multiValueRemove: () => '!p-0.5',
                }}
                styles={{
                  multiValue: (base, props) => ({
                    ...base,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'nowrap',
                    fontSize: '0.875rem !important',
                    padding: '0 0.5rem',
                    borderRadius: '2.25rem',
                    margin: '0 0.125rem',
                    color: randomColor({
                      seed: props.data.label,
                      luminosity: 'dark',
                    }),
                    backgroundColor: randomColor({
                      seed: props.data.label,
                      luminosity: 'light',
                      format: 'rgba',
                      alpha: 0.35,
                    }),
                  }),
                  multiValueLabel: (base, props) => ({
                    ...base,
                    color: randomColor({
                      seed: props.data.label,
                      luminosity: 'dark',
                    }),
                  }),
                }}
                onChange={(option) => {
                  setFieldValue('expert_tags', option)
                }}
              />
            </Field>

            {member.isMember && hackathon?.is_update_enabled && (
              <div className="mt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !dirty}
                  isLoading={isSubmitting}
                  className="w-full"
                >
                  Save changes
                </Button>
              </div>
            )}
          </Form>
        )}
      </Formik>
    </div>
  )
}

export { HackathonExpertsOverview }
