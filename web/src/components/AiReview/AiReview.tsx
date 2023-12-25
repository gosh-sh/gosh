import { useRecoilValue, useResetRecoilState } from 'recoil'
import { blobsCommentsAiAtom } from '../../store/comments.state'
import { GoshError, TDao } from 'react-gosh'
import { Button } from '../Form'
import { useCallback } from 'react'
import { toast } from 'react-toastify'
import { ToastError } from '../Toast'
import { supabase } from '../../supabase'
import { Form, Formik } from 'formik'
import classNames from 'classnames'

type TAiReviewProps = React.HTMLAttributes<HTMLDivElement> & {
  dao: TDao
}

const AiReview = (props: TAiReviewProps) => {
  const { dao, className } = props
  const comments = useRecoilValue(blobsCommentsAiAtom)
  const resetComments = useResetRecoilState(blobsCommentsAiAtom)

  const getFilesCount = useCallback(() => {
    const unique = new Set(comments.map(({ snapshot }) => snapshot))
    return unique.size
  }, [comments])

  const isAiMember = dao.members.find(
    ({ profile }) => profile === import.meta.env.REACT_APP_GOSHAI_PROFILE,
  )

  const onSubmitReview = async () => {
    try {
      const { error } = await supabase.client.from('gosh_ai_comments').insert({
        data: JSON.stringify(comments),
      })
      if (error) {
        throw new GoshError('Save comments error', error.message)
      }
      resetComments()
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  if (dao.version < '5.0.0' || !isAiMember || !comments.length) {
    return null
  }

  return (
    <div
      className={classNames(
        'bg-white border border-gray-e6edff rounded-xl p-2',
        className,
      )}
    >
      <div className="bg-gray-fafafd rounded-xl px-3 py-4">
        <div className="text-sm mb-2">
          {comments.length} comments in {getFilesCount()} files
        </div>
        <Formik initialValues={{}} onSubmit={onSubmitReview}>
          {({ isSubmitting }) => (
            <Form>
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Finish review, request changes
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}

export default AiReview
