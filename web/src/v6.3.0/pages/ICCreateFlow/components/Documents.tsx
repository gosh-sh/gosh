import classNames from 'classnames'
import { useDropzone } from 'react-dropzone'
import { Button } from '../../../../components/Form'
import { useCreateICFlow } from '../../../hooks/ic.hooks'
import { EICCreateStep } from '../../../types/ic.types'

const Documents = () => {
  const { state, setStep, sumbitDocuments } = useCreateICFlow()
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    disabled: false,
    noClick: state.documents.length > 0,
    onDrop: (files: File[]) => {
      sumbitDocuments(files)
    },
  })

  const onBackClick = () => {
    setStep(EICCreateStep.REPOSITORY)
  }

  const onNextClick = () => {
    setStep(EICCreateStep.FORMS, { index: 0 })
  }

  return (
    <>
      <h4>Upload documents</h4>
      <div
        className={classNames(
          'transition-colors duration-200',
          isDragActive ? 'bg-gray-100' : null,
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />

        {state.documents.length === 0 && (
          <p className="border border-dashed py-14 text-gray-7c8db5 text-center">
            Click or drag&drop documents here
          </p>
        )}

        {state.documents.length > 0 && (
          <div className="flex flex-col divide-y divide-gray-e6edff">
            {state.documents.map((file, index) => (
              <div key={index} className="py-2">
                <div>{file.name}</div>
                <div className="text-xs text-gray-53596d">
                  {file.size}B {file.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="outline-secondary" onClick={onBackClick}>
          Back
        </Button>
        <Button type="button" onClick={onNextClick}>
          Next
        </Button>
      </div>
    </>
  )
}

export { Documents }
