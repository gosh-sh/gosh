import classNames from 'classnames'
import { Field, Form, Formik } from 'formik'
import React from 'react'
import { FormikTextarea } from '../../Formik'
import { Button } from '../../Form'
import commentBtn from '../../../assets/images/comment-add.png'

type TLineContentProps = {
    commentsOn?: boolean
    content: string
    showForm: boolean
    containerProps?: React.HTMLAttributes<HTMLTableCellElement>
    commentButtonProps?: React.HTMLAttributes<HTMLDivElement>
    onCommentFormReset?(): void
    onCommentFormSubmit?(values: any, helpers: any): void
}

const LineContent = (props: TLineContentProps) => {
    const {
        commentsOn,
        content,
        showForm,
        containerProps,
        commentButtonProps,
        onCommentFormReset,
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
                    dangerouslySetInnerHTML={{
                        __html: content,
                    }}
                />
            </div>

            {commentsOn && onCommentFormSubmit && (
                <div
                    className={classNames(
                        showForm ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
                        'w-full md:w-1/2 overflow-hidden bg-white',
                        'border border-gray-e6edff rounded-xl transition-all',
                    )}
                >
                    <Formik
                        initialValues={{ comment: '' }}
                        onSubmit={onCommentFormSubmit}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <Field
                                    name="comment"
                                    component={FormikTextarea}
                                    placeholder="Say something"
                                    rows={2}
                                    className="!border-0"
                                />
                                <div className="border-t border-gray-e6edff flex items-center justify-between">
                                    <div className="grow"></div>
                                    <div className="grow text-end">
                                        <Button
                                            variant="custom"
                                            type="button"
                                            className="text-xs text-gray-7c8db5"
                                            disabled={isSubmitting}
                                            onClick={onCommentFormReset}
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            variant="custom"
                                            type="submit"
                                            className="text-xs text-gray-7c8db5"
                                            disabled={isSubmitting}
                                            isLoading={isSubmitting}
                                        >
                                            Submit
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
