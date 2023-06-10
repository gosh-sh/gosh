import { useRecoilValue, useResetRecoilState } from 'recoil'
import { blobsCommentsCountAtom } from '../../store/comments.state'
import { TDao } from 'react-gosh'
import { Button } from '../Form'
import { sum } from 'lodash'
import { useCallback } from 'react'

type TAiReviewButtonProps = {
    dao: TDao
}

const AiReview = (props: TAiReviewButtonProps) => {
    const { dao } = props
    const comments = useRecoilValue(blobsCommentsCountAtom)
    const reset = useResetRecoilState(blobsCommentsCountAtom)

    const getCommentsCount = useCallback(() => {
        const array = Object.keys(comments).map((key) => comments[key])
        return sum(array)
    }, [comments])

    return null

    // const isAiMember = dao.members.find(
    //     ({ profile }) => profile === import.meta.env.REACT_APP_GOSHAI_PROFILE,
    // )

    // if (dao.version < '5.0.0' || !isAiMember || !Object.keys(comments).length) {
    //     return null
    // }

    // return (
    //     <div className="bg-white border border-gray-e6edff rounded-xl p-2">
    //         <div className="bg-gray-fafafd rounded-xl px-3 py-4">
    //             <div className="text-sm mb-2">
    //                 {getCommentsCount()} comments in {Object.keys(comments).length} files
    //             </div>
    //             <Button onClick={reset}>Finish review, request changes</Button>
    //         </div>
    //     </div>
    // )
}

export default AiReview
