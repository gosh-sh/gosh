import { useEffect, useRef, forwardRef, useLayoutEffect, ChangeEventHandler, useState } from 'react';
import { Jodit } from './Jodit/jodit';
import { toast } from 'react-toastify'

import './Jodit/jodit/es5/jodit.fat.min.css';
// import JoditCore from 'jodit';
import { Config } from 'jodit/config';

import "./Jodit/jodit/esm/plugins/add-new-line/add-new-line";
import "./Jodit/jodit/esm/plugins/backspace/backspace";
import "./Jodit/jodit/esm/plugins/delete/delete";
import "./Jodit/jodit/esm/plugins/bold/bold";
import "./Jodit/jodit/esm/plugins/class-span/class-span";
import "./Jodit/jodit/esm/plugins/clean-html/clean-html";
import "./Jodit/jodit/esm/plugins/clipboard/clipboard";
import "./Jodit/jodit/esm/plugins/color/color";
import "./Jodit/jodit/esm/plugins/copy-format/copy-format";
import "./Jodit/jodit/esm/plugins/drag-and-drop/drag-and-drop";
import "./Jodit/jodit/esm/plugins/drag-and-drop-element/drag-and-drop-element";
import "./Jodit/jodit/esm/plugins/enter/enter";
import "./Jodit/jodit/esm/plugins/file/file";
import "./Jodit/jodit/esm/plugins/focus/focus";
import "./Jodit/jodit/esm/plugins/font/font";
import "./Jodit/jodit/esm/plugins/format-block/format-block";
import "./Jodit/jodit/esm/plugins/fullsize/fullsize";
import "./Jodit/jodit/esm/plugins/hotkeys/hotkeys";
import "./Jodit/jodit/esm/plugins/hr/hr";
import "./Jodit/jodit/esm/plugins/iframe/iframe";
import "./Jodit/jodit/esm/plugins/image/image";
import "./Jodit/jodit/esm/plugins/image-processor/image-processor";
import "./Jodit/jodit/esm/plugins/image-properties/image-properties";
import "./Jodit/jodit/esm/plugins/indent/indent";
import "./Jodit/jodit/esm/plugins/inline-popup/inline-popup";
import "./Jodit/jodit/esm/plugins/justify/justify";
import "./Jodit/jodit/esm/plugins/key-arrow-outside/key-arrow-outside";
import "./Jodit/jodit/esm/plugins/limit/limit";
import "./Jodit/jodit/esm/plugins/line-height/line-height";
import "./Jodit/jodit/esm/plugins/link/link";
import "./Jodit/jodit/esm/plugins/media/media";
import "./Jodit/jodit/esm/plugins/mobile/mobile";
import "./Jodit/jodit/esm/plugins/ordered-list/ordered-list";
import "./Jodit/jodit/esm/plugins/paste/paste";
import "./Jodit/jodit/esm/plugins/paste-from-word/paste-from-word";
import "./Jodit/jodit/esm/plugins/paste-storage/paste-storage";
import "./Jodit/jodit/esm/plugins/placeholder/placeholder";
import "./Jodit/jodit/esm/plugins/powered-by-jodit/powered-by-jodit";
import "./Jodit/jodit/esm/plugins/preview/preview";
import "./Jodit/jodit/esm/plugins/print/print";
import "./Jodit/jodit/esm/plugins/redo-undo/redo-undo";
import "./Jodit/jodit/esm/plugins/resize-cells/resize-cells";
import "./Jodit/jodit/esm/plugins/resize-handler/resize-handler";
import "./Jodit/jodit/esm/plugins/resizer/resizer";
import "./Jodit/jodit/esm/plugins/search/search";
import "./Jodit/jodit/esm/plugins/select/select";
import "./Jodit/jodit/esm/plugins/select-cells/select-cells";
import "./Jodit/jodit/esm/plugins/size/size";
import "./Jodit/jodit/esm/plugins/source/source";
import "./Jodit/jodit/esm/plugins/spellcheck/spellcheck";
import "./Jodit/jodit/esm/plugins/stat/stat";
import "./Jodit/jodit/esm/plugins/sticky/sticky";
import "./Jodit/jodit/esm/plugins/symbols/symbols";
import "./Jodit/jodit/esm/plugins/ai-assistant/ai-assistant";
import "./Jodit/jodit/esm/plugins/tab/tab";
import "./Jodit/jodit/esm/plugins/table/table";
import "./Jodit/jodit/esm/plugins/table-keyboard-navigation/table-keyboard-navigation";
import "./Jodit/jodit/esm/plugins/video/video";
import "./Jodit/jodit/esm/plugins/wrap-nodes/wrap-nodes";
import "./Jodit/jodit/esm/plugins/dtd/dtd";
import "./Jodit/jodit/esm/plugins/xpath/xpath";


import { Pandoc } from "./pandoc-wasm";

import './Jodit/plugins/change-case/change-case';
import './Jodit/plugins/font/font';
import './Jodit/plugins/file/file';
import './Jodit/plugins/edit/edit';
import './Jodit/plugins/format-block/format-block';
import { MODE_WYSIWYG } from "./Jodit/jodit/esm/core/constants.js";
import Loader from '../../../components/Loader';
import './Jodit/plugins/outdent/outdent';
import './Jodit/plugins/ordered-list/ordered-list';

const { isFunction } = Jodit.modules.Helpers;

function usePrevious(value?: string) {
	const ref = useRef<string>();
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref.current;
}

type TJoditEditorPanelProps = {
	className?: string,
	id?: string,
	name?: string,
	onBlur?:  (value: string | undefined) => void,
	onChange?: (value: string | undefined) => void,
	editorRef?: (ref?: Jodit) => void,
	tabIndex?: number,
  value?: string,
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
			editorRef
		}: TJoditEditorPanelProps,
		ref
	) => {
		const editorElement = useRef<HTMLTextAreaElement>(null);
		const editorInstance = useRef<Jodit>();
    const [disabled, setDisabled] = useState<boolean>(false);

		useLayoutEffect(() => {
			if (ref) {
				if (isFunction(ref)) {
					ref(editorElement.current);
				} else {
					ref.current = editorElement.current;
				}
			}
		}, [editorElement, ref]);

		useEffect(() => {
			const element = editorElement.current;
  
      
      const jodit = Jodit.make(element as HTMLElement, {

        uploader: {
          insertImageAsBase64URI: true,
          imagesExtensions: ['jpg', 'png', 'jpeg', 'gif']
        },
        height: 1200,
        // toolbarButtonSize: 'large', // Use 'large' for larger, more accessible buttons (Fat Mode)
        // toolbarSticky: true,
        // toolbarAdaptive: false,
        // showCharsCounter: true,
        showWordsCounter: true,
        showXPathInStatusbar: true,
        askBeforePasteHTML: false,
        askBeforePasteFromWord: true,
        
        // safeMode: false,
        // autofocus: true,
        defaultMode: MODE_WYSIWYG,
        observer: {
            timeout: 100
        },
        buttons: [

          {
            group: 'main',
            buttons: []
          },
          '---',
          {
            group: 'extra',
            buttons: []
          },
          '\n',
          {
            group: 'format',
            buttons: ['bold', 'italic', 'underline', 'strikethrough', 'eraser' ]
          },
          {
            group: 'fonts',
            buttons: ['fontfamily', 'fontsizepro', 'paragraphpro', 'lineHeight', 'superscript', 'subscript' ]
          },
          {
            group: 'list',
            buttons: []
          },
          '---',
          {
            group: 'edit',
            buttons: ['undo', 'redo', ]
          },
          '\n',
          {
            group: 'position',
            buttons: ['indent', 'outdent', 'align' ]
          },
          {
            group: 'color',
            buttons: []
          },
          {
            group: 'medias',
            buttons: ['image', 'video']
          },
          {
            group: 'insertion',
            buttons: ['table', 'hr', 'link', 'symbols'],
            removeButtons: ['ai-commands', 'ai-assistant']
          },
          {
            group: 'clipboard',
            buttons: []
          },
          {
            group: 'state',
            buttons: ['ai-commands', 'ai-assistant']
          },
          '---',
          {
            group: 'view',
            buttons: ['fullsize', 'source']
          },
      ],
      extraButtons: [
      ] 
    });


      editorInstance.current = jodit;

			if (isFunction(editorRef)) {
				editorRef(jodit);
			}

			return () => {
				if (jodit) {
					jodit.destruct();
          editorInstance.current = undefined;
				}
			};
		}, []);

		// const previousClassName = usePrevious(className);

		// useEffect(() => {
		// 	const classList = editorInstance.current?.container?.classList;

		// 	if (
		// 		previousClassName !== className &&
		// 		typeof previousClassName === 'string'
		// 	) {
		// 		previousClassName.split(/\s+/).forEach(cl => classList?.remove(cl));
		// 	}

		// 	if (className && typeof className === 'string') {
		// 		className.split(/\s+/).forEach(cl => classList?.add(cl));
		// 	}
		// }, [className, previousClassName]);

		// useEffect(() => {
		// 	if (editorInstance.current?.workplace) {
		// 		editorInstance.current.workplace.tabIndex = tabIndex || -1;
		// 	}
		// }, [tabIndex]);

		useEffect(() => {
			if (!editorInstance.current?.events || (!onBlur && !onChange)) {
				return;
			}

			const onBlurHandler = (e: any) =>
				onBlur && onBlur(editorElement.current?.value);
			const onChangeHandler = (value: string | undefined) => onChange && onChange(value);

			// adding event handlers
			editorInstance.current.events
				.on('blur', onBlurHandler)
				.on('change', onChangeHandler);

			return () => {
				// Remove event handlers
				editorInstance.current?.events
					?.off('blur', onBlurHandler)
					.off('change', onChangeHandler);
			};
		}, [onBlur, onChange]);

		useEffect(() => {
			const updateValue = () => {
				if (editorInstance.current && editorInstance?.current?.value !== value) {
					editorInstance.current.value = value || "";
				}
			};

			if (editorInstance.current) {
				editorInstance.current.isReady
					? updateValue()
					: editorInstance.current.waitForReady().then(updateValue);
			}
		}, [value]);

    const fileInputRef = useRef<HTMLInputElement>(null);

		useEffect(() => {
      document.addEventListener("importFile", (e) => {
        fileInputRef.current?.click();
      })
      return () => {
        document.removeEventListener("importFile", (e) => {
          fileInputRef.current?.click();
        })
      }
		}, []);

    function arrayBufferToBase64(buffer: ArrayBuffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return globalThis.btoa(binary);
    }
    function base64ToArrayBuffer(base64: string) {
      return Uint8Array.from(globalThis.atob(base64), (b) => b.charCodeAt(0));
    }

    const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      if (event.target.files && event.target.files[0]) {
        editorInstance.current!.e.fire('focus');
        editorInstance.current!.o.disabled = true;
        editorInstance.current!.focus();
        setDisabled(true);
        const file = event.target.files[0];
        const filename = file.name.split('.').slice(-1)[0] || "txt";
        
        const reader = new FileReader();

        const pandoc = new Pandoc();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            const text = arrayBufferToBase64(e.target?.result as ArrayBuffer);
            if (e.target?.result) {
              pandoc.init().then(
                async (pandoc) => {
                  try {
                    const result = await pandoc.run({
                      text: text,
                      options: { from: filename, to: "html", "embed-resources": true },
                    });
                    editorInstance.current!.o.disabled = false;
                    setDisabled(false);
                    if (editorInstance.current) {
                      editorInstance.current.editor.lastChild 
                        && editorInstance.current.s.setCursorAfter(editorInstance.current.editor.lastChild)
                      editorInstance.current.s.insertHTML(result);
                    }
                  } catch (error) {
                    editorInstance.current!.o.disabled = false;
                    setDisabled(false);
                    toast.warning('Oops, import failed...', { autoClose: 1500 })
                  }
                }
              );
            }
          };
          reader.readAsArrayBuffer(file)

      }
    };

		return (
      <>
			<div className={'jodit-react-container'}>
			  <div className={`jodit-status ${disabled && "active"}`}><Loader/>Processing imported file...</div>
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
        </div>
      </>
		);
	}
);

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
