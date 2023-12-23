import React from 'react'
import { saveAs } from 'file-saver'

type TFileDownloadProps = {
  name?: string
  content: string | Buffer
  label: React.ReactElement
  className?: string
}

const FileDownload = (props: TFileDownloadProps) => {
  const { name, content, label, className, ...rest } = props

  return (
    <button
      className={className}
      onClick={() => {
        const _blob = new Blob([content], { type: 'application/octet-stream' })
        saveAs(_blob, name)
      }}
      {...rest}
    >
      {label}
    </button>
  )
}

export default FileDownload
