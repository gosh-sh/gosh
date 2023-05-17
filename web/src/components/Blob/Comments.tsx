import { getIdenticonAvatar } from '../../helpers'
import classNames from 'classnames'
import { Button } from '../Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useBlobComments } from '../../hooks/codecomment.hooks'
import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../../pages/DaoLayout'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { toast } from 'react-toastify'
import { ToastError } from '../Toast'
import { FormikTextarea } from '../Formik'
import { useRef } from 'react'

const CommentBlock = (props: any) => {
    const { comment, className } = props
    return (
        <div
            className={classNames(
                'flex flex-nowrap border-transparent px-3 py-3 rounded-xl gap-4',
                className,
            )}
        >
            <div className="shrink-0 w-8 overflow-hidden rounded-full">
                <img
                    src={getIdenticonAvatar({
                        seed: comment.username,
                        radius: 32,
                    }).toDataUriSync()}
                />
            </div>
            <div className="grow">
                <div className="text-sm font-medium">{comment.username}</div>
                <div className="text-xs text-gray-7c8db5 my-1">{comment.datetime}</div>
                <div className="text-sm">{comment.content}</div>
            </div>
        </div>
    )
}

type TCodeCommentsProps = {
    filename: string
}

const CodeComments = (props: TCodeCommentsProps) => {
    const { filename } = props
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items, toggleThread, hoverThread, submitComment } = useBlobComments({
        dao: dao.adapter,
        filename,
    })
    const commentRefs = useRef<{ [threadId: string]: HTMLDivElement | null }>({})

    const onThreadToggle = (id: string | null) => {
        if (id) {
            toggleThread(id)
            scrollComments(id)
        }
    }

    const onAddCommentSubmit = async (
        values: { thread_id: string; comment: string },
        helpers: FormikHelpers<any>,
    ) => {
        const { thread_id, comment } = values
        try {
            await submitComment({
                id: thread_id,
                content: comment,
            })
            helpers.resetForm()
            scrollComments(thread_id)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const scrollComments = (threadId: string) => {
        commentRefs.current[threadId]?.scroll({
            top: commentRefs.current[threadId]?.scrollHeight,
            behavior: 'smooth',
        })
    }

    return (
        <div className="flex flex-col gap-3">
            {!items.length && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    No comments yet
                </div>
            )}
            {items.map((thread, index) => (
                <div key={index} className="relative">
                    <div
                        className={classNames(
                            'border-gray-e6edff border rounded-xl p-2 overflow-clip',
                            thread.isActive ? 'border-blue-348eff' : null,
                        )}
                        onMouseEnter={() => hoverThread(thread.id, true)}
                        onMouseLeave={() => hoverThread(thread.id, false)}
                    >
                        <CommentBlock
                            comment={thread.content}
                            className="bg-gray-fafafd"
                        />

                        <div
                            className={classNames(
                                'flex flex-col max-h-0 opacity-0 transition-all duration-300',
                                thread.isActive ? 'mt-1 opacity-100 max-h-screen' : null,
                            )}
                        >
                            {thread.comments.items.slice(-2).map((item, i) => (
                                <CommentBlock key={i} comment={item} />
                            ))}

                            <div className="pl-14">
                                <Button
                                    variant="custom"
                                    className="text-xs text-gray-53596d !px-0 !py-1"
                                    onClick={() => onThreadToggle(thread.id)}
                                >
                                    {thread.comments.items.length > 2
                                        ? `And +${
                                              thread.comments.items.length - 2
                                          } replies`
                                        : 'Leave your reply'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div
                        className={classNames(
                            thread.isOpen
                                ? 'opacity-100 z-50 -translate-x-6'
                                : 'opacity-0 -z-50 translate-x-0',
                            'absolute top-5 w-full',
                            'border-gray-e6edff border rounded-xl p-2 bg-white',
                            'transition-all duration-300',
                        )}
                    >
                        <div className="flex flex-nowrap justify-between items-center border-b border-b-gray-e6edff">
                            <div>
                                <Button
                                    variant="custom"
                                    className="!p-1 text-gray-7c8db5 disabled:text-gray-d6e4ee"
                                    disabled={!thread.prev}
                                    onClick={() => onThreadToggle(thread.prev)}
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} size="sm" />
                                </Button>
                                <Button
                                    variant="custom"
                                    className="!p-1 ml-2 text-gray-7c8db5 disabled:text-gray-d6e4ee"
                                    disabled={!thread.next}
                                    onClick={() => onThreadToggle(thread.next)}
                                >
                                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                                </Button>
                            </div>
                            <div>
                                <Button
                                    variant="custom"
                                    className="!p-1 text-gray-7c8db5"
                                    onClick={() => onThreadToggle(thread.id)}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </Button>
                            </div>
                        </div>
                        <div
                            className="flex flex-col max-h-[260px] overflow-y-auto"
                            ref={(el) => (commentRefs.current[thread.id] = el)}
                        >
                            <CommentBlock
                                comment={thread.content}
                                className="bg-gray-fafafd"
                            />
                            {thread.comments.items.map((item, i) => (
                                <CommentBlock key={i} comment={item} />
                            ))}
                        </div>
                        <div className="mt-1">
                            <Formik
                                initialValues={{ thread_id: thread.id, comment: '' }}
                                onSubmit={onAddCommentSubmit}
                                enableReinitialize
                            >
                                {({ isSubmitting }) => (
                                    <Form>
                                        <div>
                                            <Field
                                                name="comment"
                                                component={FormikTextarea}
                                                placeholder="Say something"
                                                autoComplete="off"
                                            />
                                        </div>
                                        <div className="text-end">
                                            <Button
                                                type="submit"
                                                variant="custom"
                                                className="text-xs text-gray-7c8db5"
                                                disabled={isSubmitting}
                                                isLoading={isSubmitting}
                                            >
                                                Submit
                                            </Button>
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export { CodeComments }
