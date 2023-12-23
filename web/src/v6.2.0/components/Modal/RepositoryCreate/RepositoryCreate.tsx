import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import randomColor from 'randomcolor'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../../components/Form'
import { BaseField, FormikInput, FormikTextarea } from '../../../../components/Formik'
import { ModalCloseButton } from '../../../../components/Modal'
import { Select2ClassNames } from '../../../../helpers'
import { appModalStateAtom } from '../../../../store/app.state'
import { useDao } from '../../../hooks/dao.hooks'
import { useCreateRepository } from '../../../hooks/repository.hooks'
import yup from '../../../yup-extended'

type TFormValues = {
  name: string
  description?: string
  expert_tags: string[]
}

const RepositoryCreateModal = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const { create: createRepository } = useCreateRepository()

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

  const onRepositoryCreate = async (values: TFormValues) => {
    const { name, description, expert_tags } = values
    try {
      const { eventaddr } = await createRepository(name, description, expert_tags)
      onModalReset()
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{ name: '', expert_tags: [] }}
        onSubmit={onRepositoryCreate}
        validationSchema={yup.object().shape({
          name: yup.string().reponame().required('Name is required'),
        })}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
              Create new repository
            </Dialog.Title>
            <div className="mb-4">
              <Field
                name="name"
                component={FormikInput}
                autoComplete="off"
                placeholder="Repository name"
                disabled={isSubmitting}
                onChange={(e: any) => setFieldValue('name', e.target.value.toLowerCase())}
                test-id="input-repo-name"
              />
            </div>

            <div className="mb-4">
              <Field
                name="description"
                component={FormikTextarea}
                autoComplete="off"
                placeholder="Repository description (optional)"
                disabled={isSubmitting}
                maxRows={6}
                test-id="input-repo-description"
              />
            </div>

            <div className="mb-6">
              <Field name="expert_tags" component={BaseField}>
                <Select
                  options={dao.details.expert_tags?.map((item) => ({
                    label: item.name,
                    value: item.name,
                  }))}
                  isMulti
                  isClearable
                  isDisabled={isSubmitting}
                  placeholder="Karma tags"
                  classNames={{
                    ...Select2ClassNames,
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
                    setFieldValue(
                      'expert_tags',
                      option.map(({ value }) => value),
                    )
                  }}
                />
              </Field>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="w-full"
                test-id="btn-repo-create"
              >
                Create repository
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  )
}

export { RepositoryCreateModal }
