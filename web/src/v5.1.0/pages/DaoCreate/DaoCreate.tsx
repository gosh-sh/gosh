import { ErrorMessage, Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/Form'
import {
  FormikTextarea,
  FormikInput,
  FormikCheckbox,
  BaseField,
} from '../../../components/Formik'
import { useState } from 'react'
import { Select2ClassNames, getIdenticonAvatar } from '../../../helpers'
import yup from '../../yup-extended'
import CreatableSelect from 'react-select/creatable'
import { useCreateDao } from '../../hooks/dao.hooks'

type TFormValues = {
  name: string
  tags: string[]
  description: string
  supply: string
  mint: boolean
}

const avatarInitialState = getIdenticonAvatar({ seed: '' }).toDataUriSync()

const DaoCreatePage = () => {
  const navigate = useNavigate()
  const { createDao } = useCreateDao()
  const [avatar, setAvatar] = useState<string>(avatarInitialState)

  const onDaoCreate = async (values: TFormValues) => {
    try {
      const { name, tags, description, supply, mint } = values
      await createDao({
        name,
        tags,
        supply: parseInt(supply),
        isMintOn: mint,
        description,
      })
      navigate(`/o/${name}`)
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <div className="container my-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-medium text-3xl text-center mb-14">
          Set up your organization
        </h1>

        <Formik
          initialValues={{
            name: '',
            tags: [],
            description: '',
            supply: '',
            mint: true,
          }}
          onSubmit={onDaoCreate}
          validationSchema={yup.object().shape({
            name: yup.string().daoname().daoexists().required('Name is required'),
            tags: yup.array().of(yup.string()).max(3),
            supply: yup
              .number()
              .integer()
              .positive()
              .min(20)
              .required('Field is required'),
          })}
          enableReinitialize
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-8">
                <div className="w-2/3">
                  <div>
                    <Field
                      name="name"
                      component={FormikInput}
                      placeholder="New organization name"
                      autoComplete="off"
                      disabled={isSubmitting}
                      onChange={(e: any) => {
                        const name = e.target.value.toLowerCase()
                        setFieldValue('name', name)
                        setAvatar(
                          getIdenticonAvatar({
                            seed: name,
                          }).toDataUriSync(),
                        )
                      }}
                      test-id="input-dao-name"
                    />
                  </div>

                  <div className="mt-8">
                    <Field name="tags" component={BaseField}>
                      <CreatableSelect
                        isMulti
                        isClearable
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

                  <div className="mt-8">
                    <Field
                      name="description"
                      component={FormikTextarea}
                      placeholder="Short description"
                      autoComplete="off"
                      disabled={isSubmitting}
                      maxRows={5}
                      test-id="input-dao-description"
                    />
                  </div>

                  <div className="mt-8">
                    <Field
                      name="supply"
                      component={FormikInput}
                      placeholder="Total supply"
                      autoComplete="off"
                      disabled={isSubmitting}
                      test-id="input-dao-supply"
                    />
                  </div>

                  <div className="mt-8">
                    <Field
                      type="checkbox"
                      name="mint"
                      component={FormikCheckbox}
                      inputProps={{
                        label: 'Allow mint',
                      }}
                      disabled={isSubmitting}
                      help={
                        values.mint
                          ? 'This option enables the DAO token mint'
                          : 'If you uncheck this option the DAO token supply will be capped to the number above'
                      }
                      helpClassName={values.mint ? null : 'text-red-ff3b30'}
                      test-id="input-dao-mint"
                    />
                  </div>
                </div>

                <div className="">
                  <div className="font-medium text-gray-7c8db5 mb-2">
                    Organization picture
                  </div>
                  <div className="w-44 rounded-lg overflow-hidden">
                    <img src={avatar} className="w-full" alt="" />
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  test-id="btn-dao-create"
                >
                  Create organization
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}

export default DaoCreatePage
