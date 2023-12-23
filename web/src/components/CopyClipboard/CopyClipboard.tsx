import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome'
import React from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { toast } from 'react-toastify'
import { ToastOptionsShortcuts } from '../../helpers'
import { faCopy } from '@fortawesome/free-regular-svg-icons'
import classNames from 'classnames'

type TCopyClipboardProps = {
  componentProps: Omit<CopyToClipboard.Props, 'children'>
  className?: string
  label?: React.ReactNode
  labelClassName?: string
  iconContainerClassName?: string
  iconProps?: Omit<FontAwesomeIconProps, 'icon'>
  testId?: string
}

const CopyClipboard = (props: TCopyClipboardProps) => {
  const {
    componentProps,
    className,
    label,
    labelClassName,
    iconContainerClassName,
    iconProps,
    testId,
  } = props

  return (
    <CopyToClipboard
      {...componentProps}
      text={componentProps.text}
      onCopy={
        componentProps.onCopy
          ? componentProps.onCopy
          : () => toast.success('Copied', ToastOptionsShortcuts.CopyMessage)
      }
    >
      <div className={classNames('flex items-center', className)}>
        {label && (
          <div className={classNames('cursor-pointer mr-2', labelClassName)}>{label}</div>
        )}
        <button type="button" className={iconContainerClassName} test-id={testId}>
          <FontAwesomeIcon {...iconProps} icon={faCopy} />
        </button>
      </div>
    </CopyToClipboard>
  )
}

export default CopyClipboard
