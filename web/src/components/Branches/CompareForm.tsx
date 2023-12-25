import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Form, Formik } from 'formik'
import { classNames, useBranches } from 'react-gosh'
import { TBranch } from 'react-gosh/dist/types/repo.types'
import { Button } from '../Form'
import { BranchSelect } from './Dropdown'
import yup from '../../v1.0.0/yup-extended'

type TBranchCompareFormProps = {
  className?: string
  onBuild(values: TBranchFormValues): Promise<void>
}

type TBranchFormValues = {
  src: TBranch
  dst: TBranch
}

const BranchCompareForm = (props: TBranchCompareFormProps) => {
  const { className, onBuild } = props
  const { branch, branches } = useBranches(undefined, 'main')

  return (
    <div className={classNames(className)}>
      <Formik
        initialValues={{
          src: branch!,
          dst: branch!,
        }}
        onSubmit={onBuild}
        validationSchema={yup.object().shape({
          src: yup.object({ name: yup.string().required('Field is required') }),
          dst: yup.object({ name: yup.string().required('Field is required') }),
        })}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form className="flex items-center gap-x-4">
            <BranchSelect
              branch={values.src}
              branches={branches}
              onChange={(selected) => {
                !!selected && setFieldValue('src', selected)
              }}
            />
            <span>
              <FontAwesomeIcon icon={faChevronRight} size="sm" />
            </span>
            <BranchSelect
              branch={values.dst}
              branches={branches}
              onChange={(selected) => {
                !!selected && setFieldValue('dst', selected)
              }}
            />
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              test-id="btn-merge-compare"
            >
              Compare
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export { BranchCompareForm }
