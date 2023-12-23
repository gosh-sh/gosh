import ContentLoader, { IContentLoaderProps } from 'react-content-loader'

type TSkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  skeleton?: IContentLoaderProps
}

const Skeleton = (props: TSkeletonProps) => {
  const { className, children, skeleton } = props
  return (
    <div className={className}>
      <ContentLoader
        speed={1.5}
        width="100%"
        backgroundColor="#e6edff"
        foregroundColor="#fafafd"
        {...skeleton}
      >
        {children}
      </ContentLoader>
    </div>
  )
}

export default Skeleton
