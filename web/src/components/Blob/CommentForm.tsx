import { faArrowUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Button } from '../Form'
import { FormikTextarea } from '../Formik'

export type TCommentFormValues = {
  comment: string
}

type TCommentFormProps = {
  onSubmit(values: TCommentFormValues, helpers: FormikHelpers<TCommentFormValues>): void
}

const CommentForm = (props: TCommentFormProps) => {
  const { onSubmit } = props

  return (
    <Formik initialValues={{ comment: '' }} onSubmit={onSubmit}>
      {({ isSubmitting }) => (
        <Form>
          <Field
            name="comment"
            component={FormikTextarea}
            placeholder="Say something"
            minRows={3}
            maxRows={6}
            className="!border-0"
          />
          <div className="border-t border-gray-e6edff flex items-center justify-between px-1 py-1">
            <div className="grow"></div>
            <div className="grow text-end">
              <Button
                variant="custom"
                type="submit"
                className="text-xs text-white bg-blue-1e7aec !rounded-full w-6 h-6 !p-0 hover:bg-blue-2b89ff"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {!isSubmitting && <FontAwesomeIcon icon={faArrowUp} />}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default CommentForm
