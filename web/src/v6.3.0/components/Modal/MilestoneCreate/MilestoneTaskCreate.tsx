import { Dialog, Popover } from '@headlessui/react'
import { Field, Form, Formik, FormikProps } from 'formik'
import CreatableSelect from 'react-select/creatable'
import { useCreateMilestoneTask } from '../../../hooks/dao.hooks'
import { BaseField, FormikInput, FormikSlider } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { Select2ClassNames } from '../../../../helpers'
import { ModalCloseButton } from '../../../../components/Modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import yup from '../../../yup-extended'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import _ from 'lodash'
import { useMemo } from 'react'
import { getGrantMapping } from '../../Task'

type TMilestoneTaskCreateModalProps = {
  milename: string
  reponame: string
  budget: number
}

type TFormValues = {
  milename: string
  repository: string
  taskname: string
  amount: string
  assign: number
  review: number
  manager: number
  tags?: string[]
}

const Distribution = (props: { form: FormikProps<TFormValues> }) => {
  const {
    form: { values, errors },
  } = props
  const sumPercent = _.sum([values.assign, values.review, values.manager])
  const hasPercent = values.assign || values.review || values.manager
  const hasError = errors.assign || errors.review || errors.manager

  const grant = useMemo(() => {
    return getGrantMapping({
      amount: parseInt(values.amount || '0'),
      percent: {
        assign: values.assign,
        review: values.review,
        manager: values.manager,
      },
      lock: [],
    })
  }, [values.amount, sumPercent])

  return (
    <Popover>
      {({ open }) => (
        <>
          <Popover.Button
            as={Button}
            type="button"
            variant={hasError ? 'outline-danger' : 'outline-secondary'}
          >
            {hasPercent
              ? `${values.assign}%, ${values.review}%, ${values.manager}%`
              : 'Distribution'}
            <FontAwesomeIcon
              icon={faChevronDown}
              size="sm"
              className={classNames(
                'ml-2 transition-all duration-200',
                open ? 'rotate-180' : 'rotate-0',
              )}
            />
          </Popover.Button>
          <Popover.Panel className="absolute top-full left-0 w-full max-w-sm z-1 translate-y-1">
            <div className="p-6 bg-white rounded-xl border border-gray-e6edff">
              <h3 className="font-medium mb-5">Select task tokens distribution</h3>
              <div className="mb-5">
                <div
                  className={classNames(
                    'text-sm mb-1',
                    sumPercent !== 100 ? 'text-red-ff3b30' : 'text-gray-7c8db5',
                  )}
                >
                  Sum of all
                </div>
                <div className="flex flex-nowrap items-center gap-x-4">
                  <div
                    className={classNames(
                      'text-xl',
                      sumPercent !== 100 ? 'text-red-ff3b30' : null,
                    )}
                  >
                    {sumPercent}%
                  </div>
                  <div className="text-sm text-gray-7c8db5">{values.amount}</div>
                </div>
              </div>
              <div className="mb-7">
                <Field
                  component={FormikSlider}
                  label="Commit author for accepted merge"
                  name="assign"
                  inputProps={{ label: '%' }}
                  max={100}
                  help={grant.assign.int.toLocaleString()}
                />
              </div>
              <div className="mb-7">
                <Field
                  component={FormikSlider}
                  label="Code reviewer for accepted merge"
                  name="review"
                  inputProps={{ label: '%' }}
                  max={100}
                  help={grant.review.int.toLocaleString()}
                />
              </div>
              <div>
                <Field
                  component={FormikSlider}
                  label="Manager for closed task"
                  name="manager"
                  inputProps={{ label: '%' }}
                  max={100}
                  help={grant.manager.int.toLocaleString()}
                />
              </div>
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  )
}

const MilestoneTaskCreateModal = (props: TMilestoneTaskCreateModalProps) => {
  const { milename, reponame, budget } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const { createMilestoneTask } = useCreateMilestoneTask()

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

  const onCreateMilestoneTask = async (values: TFormValues) => {
    try {
      await createMilestoneTask({
        milename,
        reponame,
        taskname: values.taskname,
        reward: {
          assign: values.assign,
          review: values.review,
          manager: values.manager,
        },
        amount: parseInt(values.amount),
        tags: values.tags,
      })
      onModalReset()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{
          milename,
          repository: reponame,
          taskname: '',
          amount: '',
          assign: 0,
          review: 0,
          manager: 0,
        }}
        validationSchema={yup.object().shape({
          milename: yup.string().required(),
          repository: yup.string().required(),
          taskname: yup.string().required(),
          amount: yup.number().min(1).max(budget).required(),
          assign: yup.number().min(1).max(100),
          review: yup.number().min(0).max(100),
          manager: yup.number().min(0).max(100),
          tags: yup.array().of(yup.string()).max(3),
        })}
        onSubmit={onCreateMilestoneTask}
      >
        {(form) => (
          <Form>
            <ModalCloseButton disabled={form.isSubmitting} />
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
              Add task to milestone
            </Dialog.Title>

            <div className="mb-4">
              <Field
                component={FormikInput}
                name="milename"
                autoComplete="off"
                help="Milestone"
                disabled
                readOnly
              />
            </div>
            <div className="mb-4">
              <Field
                component={FormikInput}
                name="repository"
                autoComplete="off"
                help="Repository"
                disabled
                readOnly
              />
            </div>
            <div className="mb-4">
              <Field
                component={FormikInput}
                name="taskname"
                placeholder="Task name"
                autoComplete="off"
                disabled={form.isSubmitting}
              />
            </div>
            <div className="relative mb-4 flex flex-nowrap gap-3">
              <div className="grow">
                <Field
                  component={FormikInput}
                  name="amount"
                  placeholder="Reward"
                  autoComplete="off"
                  disabled={form.isSubmitting}
                  help={`${budget} available`}
                />
              </div>
              <Distribution form={form} />
            </div>
            <div className="mb-4">
              <Field name="tags" component={BaseField}>
                <CreatableSelect
                  isMulti
                  isClearable
                  openMenuOnClick={false}
                  classNames={Select2ClassNames}
                  placeholder="Tags (up to 3)"
                  isDisabled={form.isSubmitting}
                  onChange={(option) => {
                    const items = option.map((item: any) => item.value)
                    form.setFieldValue('tags', items, true)
                  }}
                />
              </Field>
            </div>
            <div className="text-center">
              <Button
                type="submit"
                isLoading={form.isSubmitting}
                disabled={form.isSubmitting}
              >
                Add task to milestone
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  )
}

export { MilestoneTaskCreateModal }
