import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import yup from '../../../yup-extended'
import { FormikInput } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useCreateRepository } from '../../../hooks/repository.hooks'
import { ModalCloseButton } from '../../../../components/Modal'

type TFormValues = {
  name: string
}

const RepositoryCreateModal = () => {
  const setModal = useSetRecoilState(appModalStateAtom)
  const { create: createRepository } = useCreateRepository()

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

  const onRepositoryCreate = async (values: TFormValues) => {
    try {
      await createRepository(values.name)
      onModalReset()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{ name: '' }}
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
            <div className="mb-6">
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
