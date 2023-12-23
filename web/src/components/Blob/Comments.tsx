import { getIdenticonAvatar } from '../../helpers'
import classNames from 'classnames'
import { Button } from '../Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUp,
  faChevronLeft,
  faChevronRight,
  faTimes,
} from '@fortawesome/free-solid-svg-icons'
import { useBlobComments } from '../../hooks/codecomment.hooks'
import { useParams } from 'react-router-dom'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { toast } from 'react-toastify'
import { ToastError } from '../Toast'
import { FormikTextarea } from '../Formik'
import { useRef, useState } from 'react'
import { faCheckCircle } from '@fortawesome/free-regular-svg-icons'
import { Tooltip } from 'react-tooltip'
import Loader from '../Loader/Loader'
import moment from 'moment'
import { useDao } from 'react-gosh'

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
        <div
          className="text-xs text-gray-7c8db5 my-1"
          data-tooltip-id="tip-datetime"
          data-tooltip-content={new Date(comment.datetime).toLocaleString()}
        >
          {moment(comment.datetime).format('D MMM, H:mm')}
        </div>
        <div className="text-sm">{comment.content}</div>
      </div>
      <Tooltip id="tip-datetime" clickable className="z-50" />
    </div>
  )
}

type TCodeCommentsProps = {
  filename: string
  multiple?: boolean
}

const CodeComments = (props: TCodeCommentsProps) => {
  const urlparams = useParams()
  const { filename, multiple } = props
  const dao = useDao(urlparams.daoname || urlparams.daoName || '')
  const {
    threads,
    toggleThread,
    hoverThread,
    resolveThread,
    getCommentsNext,
    submitComment,
  } = useBlobComments({
    dao: dao.adapter!,
    filename,
    multiple,
  })
  const commentRefs = useRef<{ [threadId: string]: HTMLDivElement | null }>({})
  const [isTextareaFocus, setTextareaFocus] = useState<boolean>(false)

  const onThreadToggle = (id: string | null) => {
    if (id) {
      toggleThread(id)
      scrollComments(id)
    }
  }

  const onThreadResolve = async (values: { id: string }) => {
    const { id } = values
    try {
      await resolveThread(id, true)
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
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
      {threads.isFetching && (
        <Loader className="text-center text-sm">Fetching comments</Loader>
      )}
      {!threads.isFetching && !threads.items.length && (
        <div className="text-sm text-gray-7c8db5 text-center p-4">No comments yet</div>
      )}
      {threads.items.map((thread, index) => (
        <div
          key={index}
          className={classNames(
            'flex flex-nowrap items-start overflow-hidden',
            thread.isResolved ? 'opacity-60' : null,
            thread.isOpen ? 'sticky top-1 bottom-1 z-10' : null,
          )}
        >
          <div
            className={classNames(
              'basis-full shrink-0 border-gray-e6edff border rounded-xl p-2',
              'transition-all duration-300',
              thread.isOpen ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100',
            )}
            onMouseEnter={() => hoverThread(thread.id, true)}
            onMouseLeave={() => hoverThread(thread.id, false)}
          >
            <CommentBlock comment={thread.content} className="bg-gray-fafafd" />

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
                    ? `And +${thread.comments.items.length - 2} replies`
                    : 'Leave your reply'}
                </Button>
              </div>
            </div>
          </div>

          <div
            className={classNames(
              'basis-full shrink-0 border-gray-e6edff border rounded-xl p-2 bg-white',
              'transition-all duration-300',
              thread.isOpen
                ? '-translate-x-full !border-blue-348eff max-h-screen opacity-100'
                : 'translate-x-0 max-h-0 opacity-0',
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
                {dao.details?.isAuthMember && !thread.isResolved && (
                  <div className="inline-block">
                    <Formik
                      initialValues={{ id: thread.id }}
                      onSubmit={onThreadResolve}
                      enableReinitialize
                    >
                      {({ isSubmitting }) => (
                        <Form>
                          <Button
                            type="submit"
                            variant="custom"
                            className={classNames(
                              '!p-1 text-gray-7c8db5',
                              !thread.isOpen ? 'pointer-events-none' : null,
                            )}
                            data-tooltip-id={`tip-resolve-${thread.id}`}
                            data-tooltip-content="Resolve thread"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                          >
                            {!isSubmitting && <FontAwesomeIcon icon={faCheckCircle} />}
                          </Button>
                        </Form>
                      )}
                    </Formik>
                    <Tooltip id={`tip-resolve-${thread.id}`} clickable className="z-50" />
                  </div>
                )}
                <Button
                  variant="custom"
                  className="ml-2 !p-1 text-gray-7c8db5"
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
              <CommentBlock comment={thread.content} className="bg-gray-fafafd" />
              {thread.comments.hasNext && (
                <Button
                  variant="custom"
                  className="mt-2 text-xs text-gray-7c8db5"
                  disabled={thread.comments.isFetching}
                  isLoading={thread.comments.isFetching}
                  onClick={() => getCommentsNext(thread.id)}
                >
                  Load previous comments
                </Button>
              )}
              {thread.comments.items.map((item, i) => (
                <CommentBlock key={i} comment={item} />
              ))}
            </div>
            {dao.details?.isAuthMember && (
              <div className="mt-1 border rounded-lg overflow-hidden bg-gray-fafafd">
                <Formik
                  initialValues={{ thread_id: thread.id, comment: '' }}
                  onSubmit={onAddCommentSubmit}
                  enableReinitialize
                >
                  {({ isSubmitting, values }) => (
                    <Form>
                      <div>
                        <Field
                          name="comment"
                          className="!border-0"
                          component={FormikTextarea}
                          placeholder="Say something"
                          autoComplete="off"
                          resize={false}
                          maxRows={6}
                          minRows={isTextareaFocus ? 2 : 1}
                          onFocus={() => {
                            setTextareaFocus(true)
                          }}
                          onBlur={() => {
                            if (!values.comment) {
                              setTextareaFocus(false)
                            }
                          }}
                        />
                      </div>
                      <div
                        className={classNames(
                          'text-end px-4 overflow-hidden',
                          'transition-all duration-200',
                          isTextareaFocus
                            ? 'py-2 border-t max-h-screen opacity-100'
                            : 'max-h-0 opacity-0',
                        )}
                      >
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
                    </Form>
                  )}
                </Formik>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export { CodeComments }
