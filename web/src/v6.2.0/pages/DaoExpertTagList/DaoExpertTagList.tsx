import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/Form'
import { FormikInput, FormikTextarea } from '../../../components/Formik'
import { BadgeExpertTag } from '../../components/Badge'
import { useDao, useUpdateDaoExpertTags } from '../../hooks/dao.hooks'
import yup from '../../yup-extended'

type TFormValues = {
  tags: { _motion_id: string; _disabled: boolean; name: string; multiplier: string }[]
  comment: string
}

const DaoExpertTagListPage = () => {
  const { daoname } = useParams()
  const navigate = useNavigate()
  const dao = useDao()
  const { update } = useUpdateDaoExpertTags()
  const [expert_tags, setExpertTags] = useState<TFormValues['tags']>([])

  const onFormSubmit = async (values: TFormValues) => {
    try {
      const filtered = values.tags
        .filter((item) => !!item.name && !!item.multiplier)
        .map((item) => ({
          name: item.name.trim().toLowerCase(),
          multiplier: parseInt(item.multiplier),
        }))
      const { eventaddr } = await update({
        tags: filtered,
        comment: values.comment.trim(),
      })
      if (eventaddr) {
        navigate(`/o/${daoname}/events/${eventaddr || ''}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  useEffect(() => {
    const empty = { _motion_id: '0', _disabled: false, name: '', multiplier: '100' }
    const expert_tags =
      dao.details.expert_tags?.map((item) => ({
        _motion_id: item.name,
        _disabled: true,
        name: item.name,
        multiplier: item.multiplier.toString(),
      })) || []
    if (expert_tags.length === 0) {
      expert_tags.push(empty)
    }

    setExpertTags(expert_tags)
  }, [dao.details.expert_tags?.length])

  return (
    <Formik
      initialValues={{
        tags: expert_tags,
        comment: '',
      }}
      onSubmit={onFormSubmit}
      validationSchema={yup.object().shape({
        tags: yup.array().of(
          yup.object().shape({
            name: yup.string().required(),
            multiplier: yup.number().integer().positive().min(100).required(),
          }),
        ),
        comment: yup.string().required(),
      })}
      enableReinitialize
    >
      {({ isSubmitting }) => (
        <Form>
          <div>
            <h3 className="text-xl font-medium">DAO karma tags</h3>
            <p className="mt-2.5 mb-6">
              This works as a proof of specialization for the members' karma in this DAO!
            </p>
            <div className="p-4 border border-gray-e6edff rounded-xl bg-gray-fafafd">
              <FieldArray
                name="tags"
                render={(helpers: any) => <FieldArrayForm {...helpers} />}
              />
            </div>
          </div>

          <hr className="mt-12 mb-10 h-px bg-gray-e6edff" />

          <div>
            <h3 className="text-xl font-medium">Save changes</h3>
            <div className="mt-4">
              <Field
                name="comment"
                component={FormikTextarea}
                disabled={isSubmitting}
                placeholder="Leave comment"
                maxRows={8}
              />
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Save changes and create proposal
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  )
}

const FieldArrayForm = (props: FieldArrayRenderProps) => {
  const { form, remove, push } = props
  const values = form.values as TFormValues

  const onItemAdd = () => {
    push({
      _motion_id: Date.now().toString(),
      _disabled: false,
      name: '',
      multiplier: '100',
    })
  }

  const onItemRemove = (index: number) => {
    remove(index)
  }

  return (
    <>
      <div className="flex flex-col gap-y-4">
        <AnimatePresence>
          {values.tags.map((item, index) => {
            return (
              <motion.div
                key={item._motion_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-2.5"
              >
                <div className="basis-auto grow lg:basis-3/12 lg:grow-0 order-1">
                  {item._disabled ? (
                    <BadgeExpertTag
                      content={item.name}
                      className="inline-flex items-center py-2 px-4"
                    />
                  ) : (
                    <Field
                      name={`tags.${index}.name`}
                      component={FormikInput}
                      placeholder="Tag name"
                      autoComplete="off"
                      disabled={item._disabled || form.isSubmitting}
                      className="bg-white"
                    />
                  )}

                  {Array.isArray(form.errors.tags) && (
                    <ErrorMessage
                      className="text-xs text-red-ff3b30 mt-1"
                      component="div"
                      name={`tags.${index}.name`}
                    />
                  )}
                </div>
                <div className="basis-full lg:basis-2/12 order-3 lg:order-2">
                  <Field
                    name={`tags.${index}.multiplier`}
                    component={FormikInput}
                    placeholder="Multiplier"
                    autoComplete="off"
                    disabled={form.isSubmitting}
                    inputProps={{
                      after: <div className="p-2 text-sm text-gray-7c8db5">%</div>,
                    }}
                    className="bg-white"
                  />
                  {Array.isArray(form.errors.tags) && (
                    <ErrorMessage
                      className="text-xs text-red-ff3b30 mt-1"
                      component="div"
                      name={`tags.${index}.multiplier`}
                    />
                  )}
                </div>
                <div className="text-right order-2 lg:order-3">
                  <Button
                    type="button"
                    variant="custom"
                    className="!p-1 text-gray-53596d"
                    disabled={form.isSubmitting}
                    onClick={() => onItemRemove(index)}
                  >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          variant="custom"
          className="inline-block border !border-black text-black !rounded-[2rem] !py-1.5"
          disabled={form.isSubmitting}
          onClick={onItemAdd}
        >
          Add tag
          <FontAwesomeIcon icon={faPlus} className="ml-3" />
        </Button>
      </div>
    </>
  )
}

export default DaoExpertTagListPage
