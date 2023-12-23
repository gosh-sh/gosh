import classNames from 'classnames'
import { Field, Form, Formik } from 'formik'
import React, { MutableRefObject } from 'react'
import { FormikTextarea } from '../../Formik'
import { Button } from '../../Form'
import commentBtn from '../../../assets/images/comment-add.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUp } from '@fortawesome/free-solid-svg-icons'

type TLineContentProps = {
  commentsOn?: boolean
  commentFormRefs: MutableRefObject<{
    [line: number]: HTMLDivElement | null
  }>
  line: number
  content: string
  showForm: boolean
  containerProps?: React.HTMLAttributes<HTMLTableCellElement>
  commentButtonProps?: React.HTMLAttributes<HTMLDivElement>
  onCommentFormSubmit?(values: any, helpers: any): void
}

const LineContent = (props: TLineContentProps) => {
  const {
    commentsOn,
    commentFormRefs,
    line,
    content,
    showForm,
    containerProps,
    commentButtonProps,
    onCommentFormSubmit,
  } = props

  return (
    <td className="relative group pl-4" {...containerProps}>
      {commentsOn && (
        <div
          className={classNames(
            'absolute hidden top-0 left-0 rounded-full w-5 h-5 mx-2 cursor-pointer',
            'group-hover:block hover:scale-125 transition-transform',
          )}
          {...commentButtonProps}
        >
          <img src={commentBtn} className="w-full" />
        </div>
      )}
      <div className="pl-4">
        <pre
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: content,
          }}
        />
      </div>

      {commentsOn && onCommentFormSubmit && (
        <div
          ref={(el) => (commentFormRefs.current[line] = el)}
          className={classNames(
            showForm ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
            'w-full md:w-1/2 overflow-hidden bg-white',
            'border border-gray-e6edff rounded-xl transition-all',
          )}
        >
          <Formik initialValues={{ comment: '' }} onSubmit={onCommentFormSubmit}>
            {({ isSubmitting }) => (
              <Form>
                <Field
                  name="comment"
                  component={FormikTextarea}
                  placeholder="Say something"
                  rows={1}
                  maxRows={6}
                  className="!border-0"
                  autoResize={false}
                />
                <div className="border-t border-gray-e6edff flex items-center justify-between px-4 py-1">
                  <div className="grow"></div>
                  <div className="grow text-end">
                    <Button
                      variant="custom"
                      type="submit"
                      className={classNames(
                        'text-xs text-white bg-blue-1e7aec',
                        '!rounded-full w-6 h-6 !p-0',
                        'hover:bg-blue-2b89ff',
                      )}
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
        </div>
      )}
    </td>
  )
}

export default LineContent
