import './jodit_/es2021/jodit.fat.min.css'
import './jodit_/esm/plugins/add-new-line/add-new-line'
import './jodit_/esm/plugins/ai-assistant/ai-assistant'
import './jodit_/esm/plugins/backspace/backspace'
import './jodit_/esm/plugins/clean-html/clean-html'
import './jodit_/esm/plugins/clipboard/clipboard'
import './jodit_/esm/plugins/font/font'
import './jodit_/esm/plugins/format-block/format-block'
import './jodit_/esm/plugins/fullsize/fullsize'
import './jodit_/esm/plugins/hr/hr'
import './jodit_/esm/plugins/image-processor/image-processor'
import './jodit_/esm/plugins/image-properties/image-properties'
import './jodit_/esm/plugins/image/image'
import './jodit_/esm/plugins/indent/indent'
import './jodit_/esm/plugins/justify/justify'
import './jodit_/esm/plugins/line-height/line-height'
import './jodit_/esm/plugins/ordered-list/ordered-list'
import './jodit_/esm/plugins/preview/preview'
import './jodit_/esm/plugins/print/print'
import './jodit_/esm/plugins/resizer/resizer'
import './jodit_/esm/plugins/search/search'
import './jodit_/esm/plugins/source/source'
import './jodit_/esm/plugins/spellcheck/spellcheck'
import './jodit_/esm/plugins/symbols/symbols'
import './jodit_/esm/plugins/video/video'
import {
  ChangeEventHandler,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { Jodit } from './jodit_'
import { Pandoc } from './pandoc-wasm'

import { MODE_WYSIWYG } from './jodit_/esm/core/constants.js'
import './Jodit/plugins/change-case/change-case'
import './Jodit/plugins/edit/edit'
import './Jodit/plugins/file/file'
import './Jodit/plugins/font/font'
import './Jodit/plugins/format-block/format-block'

const { isFunction } = Jodit.modules.Helpers

function usePrevious(value?: string) {
  const ref = useRef<string>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

type TJoditEditorPanelProps = {
  className?: string
  id?: string
  name?: string
  onBlur?: (value: string | undefined) => void
  onChange?: (value: string | undefined) => void
  editorRef?: (ref?: Jodit) => void
  tabIndex?: number
  value?: string
  language?: string
  disabled?: boolean
  editorClassName?: string
}

const JoditEditor = forwardRef<HTMLTextAreaElement, TJoditEditorPanelProps>(
  (
    {
      className,
      id,
      name,
      onBlur,
      onChange,
      tabIndex,
      value,
      editorRef,
    }: TJoditEditorPanelProps,
    ref,
  ) => {
    const editorElement = useRef<HTMLTextAreaElement>(null)
    const editorInstance = useRef<Jodit>()

    useLayoutEffect(() => {
      if (ref) {
        if (isFunction(ref)) {
          ref(editorElement.current)
        } else {
          ref.current = editorElement.current
        }
      }
    }, [editorElement, ref])

    useEffect(() => {
      const element = editorElement.current

      const jodit = editorInstance.current
        ? null
        : Jodit.make(element as HTMLElement, {
            uploader: {
              insertImageAsBase64URI: true,
              imagesExtensions: ['jpg', 'png', 'jpeg', 'gif'],
            },
            height: 650,
            // toolbarButtonSize: 'large', // Use 'large' for larger, more accessible buttons (Fat Mode)
            toolbarSticky: true,
            toolbarAdaptive: false,
            showCharsCounter: true,
            showWordsCounter: true,
            showXPathInStatusbar: true,
            askBeforePasteHTML: true,
            askBeforePasteFromWord: true,

            safeMode: false,
            defaultMode: MODE_WYSIWYG,
            observer: {
              timeout: 100,
            },
            buttons: [
              {
                group: 'main',
                buttons: [],
              },
              '---',
              {
                group: 'extra',
                buttons: [],
              },
              '\n',
              {
                group: 'format',
                buttons: [
                  'bold',
                  'italic',
                  'underline',
                  'strikethrough',
                  'eraser',
                ],
              },
              {
                group: 'fonts',
                buttons: [
                  'fontfamily',
                  'fontsizepro',
                  'paragraphpro',
                  'lineHeight',
                  'superscript',
                  'subscript',
                ],
              },
              {
                group: 'list',
                buttons: [],
              },
              '---',
              {
                group: 'edit',
                buttons: ['undo', 'redo'],
              },
              '\n',
              {
                group: 'position',
                buttons: ['indent', 'outdent', 'align'],
              },
              {
                group: 'color',
                buttons: [],
              },
              {
                group: 'media',
                buttons: [],
              },
              {
                group: 'insertion',
                buttons: ['table', 'hr', 'link', 'symbols'],
                removeButtons: ['ai-commands', 'ai-assistant'],
              },
              {
                group: 'clipboard',
                buttons: [],
              },
              {
                group: 'state',
                buttons: ['ai-commands', 'ai-assistant'],
              },
              '---',
              {
                group: 'view',
                buttons: ['fullsize', 'source'],
              },
            ],
            extraButtons: [],
          })

      if (jodit) {
        editorInstance.current = jodit

        if (isFunction(editorRef)) {
          editorRef(jodit)
        }
      }

      return () => {
        if (jodit) {
          jodit.destruct()
          editorInstance.current = undefined
        }
      }
    }, [])

    const previousClassName = usePrevious(className)

    useEffect(() => {
      const classList = editorInstance.current?.container?.classList

      if (
        previousClassName !== className &&
        typeof previousClassName === 'string'
      ) {
        previousClassName.split(/\s+/).forEach((cl) => classList?.remove(cl))
      }

      if (className && typeof className === 'string') {
        className.split(/\s+/).forEach((cl) => classList?.add(cl))
      }
    }, [className, previousClassName])

    useEffect(() => {
      if (editorInstance.current?.workplace) {
        editorInstance.current.workplace.tabIndex = tabIndex || -1
      }
    }, [tabIndex])

    useEffect(() => {
      if (!editorInstance.current?.events || (!onBlur && !onChange)) {
        return
      }

      const onBlurHandler = (e: any) =>
        onBlur && onBlur(editorElement.current?.value)
      const onChangeHandler = (value: string | undefined) =>
        onChange && onChange(value)

      // adding event handlers
      editorInstance.current.events
        .on('blur', onBlurHandler)
        .on('change', onChangeHandler)

      return () => {
        // Remove event handlers
        editorInstance.current?.events
          ?.off('blur', onBlurHandler)
          .off('change', onChangeHandler)
      }
    }, [onBlur, onChange])

    useEffect(() => {
      const updateValue = () => {
        if (
          editorInstance.current &&
          editorInstance?.current?.value !== value
        ) {
          editorInstance.current.value = value || ''
        }
      }

      if (editorInstance.current) {
        editorInstance.current.isReady
          ? updateValue()
          : editorInstance.current.waitForReady().then(updateValue)
      }
    }, [value])

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      document.addEventListener('importFile', (e) => {
        fileInputRef.current?.click()
      })
      return () => {
        document.removeEventListener('importFile', (e) => {
          fileInputRef.current?.click()
        })
      }
    }, [])

    function arrayBufferToBase64(buffer: ArrayBuffer) {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      const len = bytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return globalThis.btoa(binary)
    }
    function base64ToArrayBuffer(base64: string) {
      return Uint8Array.from(globalThis.atob(base64), (b) => b.charCodeAt(0))
    }

    const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0]
        const filename = file.name.split('.').slice(-1)[0] || 'txt'

        console.log('Processing file:', file.name)
        console.log('Filetype:', file.name.split('.').slice(-1)[0])

        const reader = new FileReader()

        const pandoc = new Pandoc()
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const text = arrayBufferToBase64(e.target?.result as ArrayBuffer)
          if (e.target?.result) {
            pandoc.init().then(async (pandoc) => {
              console.log('init') // Outputs the file contents in console
              const result = await pandoc.run({
                text: text,
                // files: {
                //   [file.name]: e.target?.result || ''
                // },
                options: {
                  from: filename,
                  to: 'html',
                  'embed-resources': true,
                },
              })
              console.log(result)

              if (editorInstance.current) {
                editorInstance.current.editor.lastChild &&
                  editorInstance.current.s.setCursorAfter(
                    editorInstance.current.editor.lastChild,
                  )
                editorInstance.current.s.insertHTML(result)
              }
            })
          }
        }
        // reader.readAsText(file)
        reader.readAsArrayBuffer(file)
      }
    }

    // const handleClick = () => {
    //   fileInputRef.current.click();  // Triggers the hidden file input
    // };

    // params.text = arrayBufferToBase64(await inputFile.files[0].arrayBuffer());
    // // src/utils.ts

    return (
      <>
        <div className={'jodit-react-container'}>
          <textarea
            defaultValue={value}
            name={name}
            id={id}
            ref={editorElement}
          />
        </div>

        <div>
          <input
            type="file"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          {/* <button onClick={handleClick}>Select File</button> */}
        </div>
      </>
    )
  },
)

// /**
//  * @param {Jodit} jodit
//  */
// function preparePaste(jodit: Jodit) {
// 	jodit.e.on(
// 		'paste',
// 		e => {
// 			if (confirm('Change pasted content?')) {
// 				// jodit.e.stopPropagation('paste');
// 				jodit.s.insertHTML(
// 					Jodit.modules.Helpers.getDataTransfer(e)!
// 						.getData(Jodit.constants.TEXT_HTML)
// 						.replace(/a/g, 'b')
// 				);
// 				return false;
// 			}
// 		},
// 		{ top: true }
// 	);
// }
// Jodit.plugins.add('preparePaste', preparePaste);

export { JoditEditor }
