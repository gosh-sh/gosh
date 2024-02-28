import classNames from 'classnames'
import { useDao, useDaoMember } from '../../../hooks/dao.hooks'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

type TDaoDescriptionProps = React.HTMLAttributes<HTMLDivElement>

const DaoDescription = (props: TDaoDescriptionProps) => {
  const { className } = props
  const dao = useDao()
  const member = useDaoMember()

  if (!dao.details.description && !member.isMember) {
    return null
  }

  return (
    <div
      className={classNames(
        'border border-gray-e6edff rounded-xl overflow-hidden',
        className,
      )}
    >
      <div className="flex flex-nowrap justify-between p-5 border-b border-gray-e6edff">
        <div className="font-medium">README.md</div>
      </div>

      {!dao.details.description ? (
        <div className="text-center text-sm text-gray-53596d p-5">
          You can add organization description by placing
          <br />
          <span className="font-medium">README.md</span> file to main branch of{' '}
          <span className="font-medium">_index</span> repository
        </div>
      ) : (
        <div className="markdown-body px-4 py-4">
          <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
            {dao.details.description}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export { DaoDescription }
