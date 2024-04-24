import React from 'react'

type TLineContentProps = {
  content: string | TrustedHTML
  containerProps?: React.HTMLAttributes<HTMLTableCellElement>
}

const LineContent = (props: TLineContentProps) => {
  const { content, containerProps } = props

  return (
    <td className="pl-4" {...containerProps}>
      <pre
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{
          __html: content.toString(),
        }}
      />
    </td>
  )
}

export default LineContent
