import { Buffer } from 'buffer'
import { FormikHelpers } from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import hljs from 'highlight.js'
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { GoshError, classNames, getTreeItemFullPath } from 'react-gosh'
import Markdown, { MdastRoot } from 'react-markdown'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import CommentImg from '../../../assets/images/comment-add.png'
import { useBlobComments } from '../../../hooks/codecomment.hooks'
import { Button } from '../../Form'
import { ToastError } from '../../Toast'
import CommentForm, { TCommentFormValues } from '../CommentForm'
import LineContent from './LineContent'
import LineNumber from './LineNumber'

const parseMarkdown = (value: string) => {
  const recursive = (
    node: { type: string; position?: any; children?: any[]; value?: string },
    parent: any = null,
    index: number = 0,
  ) => {
    if (parent) {
      // Split each text node into words and create text node from each word,
      // otherwise push node as is into parent children
      if (node.type === 'text' && node.value) {
        const { start, end } = node.position
        const children = node.value.split(/(?<=\s)/).map((item) => {
          const columnEnd = start.column + item.length
          const offsetEnd = start.offset + item.length
          const position = {
            start: { ...start },
            end: { ...end, column: columnEnd, offset: offsetEnd },
          }

          const child = {
            type: 'span',
            children: [{ type: 'text', value: item || ' ', position }],
            position,
            index,
          }

          start.column = columnEnd
          start.offset = offsetEnd
          index += 1
          return child
        })
        parent.children.push(...children)
      } else {
        parent.children.push(node)
      }
    }

    // Loop each node child recursively
    if (node.children?.length) {
      // Memo original children length
      const len = node.children.length
      // Use closure here to avoid infinite loop,
      // because `recursive()` pushes new children
      node.children.forEach((child) => {
        index = recursive(child, node, index)
      })
      // Slice children (remove original length)
      node.children.splice(0, len)
    }
    return index
  }

  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
  const mdast = processor.parse(value)
  recursive(mdast)
  return mdast
}

const parseText = (params: { value: string; extension?: string | null }) => {
  const { value, extension } = params

  // Process with highlight.js
  const aliases = extension ? [extension] : undefined
  const content = hljs.highlightAuto(value, aliases).value
  /** Highlight.js wraps comment blocks inside <span class="hljs-comment"></span>.
   * However, when the multi-line comment block is broken down into diffirent
   * table rows, only the first row, which is appended by the <span> tag, is
   * highlighted. The following code fixes it by appending <span> to each line
   * of the comment block.*/
  const commentPattern = /<span class="hljs-comment">(.|\n)*?<\/span>/g
  const adaptedContent = content.replace(commentPattern, (data) => {
    return data.replace(/\r?\n/g, () => {
      return '\n<span class="hljs-comment">'
    })
  })
  const lines = adaptedContent.split(/\r?\n/)

  // Generate somethink similar to mdast
  let offset = 0
  return {
    type: 'root',
    children: lines.map((value, index) => {
      const line = index + 1
      const offsetInc = Math.max(1, value.length - 1)
      offset += offsetInc
      return {
        type: 'text',
        value,
        position: {
          start: { line, column: 1, offset: Math.max(0, offset - offsetInc) },
          end: { line, column: Math.max(1, value.length), offset },
        },
      }
    }),
  }
}

type TBlobPreviewProps = {
  address?: string
  filename?: string
  commit?: string
  value?: string | Buffer
  className?: string
  commentsOn?: boolean
}

const BlobPreview = (props: TBlobPreviewProps) => {
  const {
    address,
    filename = '',
    value = '',
    commit = '',
    className,
    commentsOn = false,
  } = props
  const { dao, repository } = useOutletContext<any>()
  const { threads, toggleThread, hoverThread, submitComment } = useBlobComments({
    dao: dao.adapter,
    objectAddress: address,
    filename,
    commits: [commit],
    initialize: commentsOn,
  })
  const [selection, setSelection] = useState<{
    show: boolean
    position: number[]
    metadata: { md_nodes: any[] } | null
  }>({
    show: false,
    position: [0, 0],
    metadata: null,
  })

  const extension = useMemo(() => {
    const splitted = filename.split('.')
    return splitted.length === 1 ? null : splitted.splice(-1)[0].toLowerCase()
  }, [filename])

  const semanticTree = useMemo(() => {
    if (Buffer.isBuffer(value)) {
      return null
    }
    if (extension === 'md') {
      return parseMarkdown(value)
    } else {
      return parseText({ value, extension })
    }
  }, [value, extension]) as MdastRoot

  const getSelectedElements = () => {
    return document.querySelectorAll('.comment-tmp')
  }

  const resetTextSelection = () => {
    getSelectedElements().forEach((element) => {
      if (element.parentElement) {
        element.parentElement.innerHTML = element.parentElement.innerHTML.replace(
          element.outerHTML,
          element.textContent || '',
        )
      }
    })
    setSelection((state) => ({ ...state, show: false, position: [], metadata: null }))
  }

  const setTextSelection = (e: MouseEvent) => {
    const position = [e.clientX, e.clientY]
    const selected = window.getSelection()

    /**
     * Highlight selection range or remove highlighting;
     * Generate metadata for comment
     * */
    let metadata: { md_nodes: any[] } | null = { md_nodes: [] }
    if (selected?.type === 'Range') {
      const startElement = selected.anchorNode?.parentElement
      const startElementIndex = startElement?.getAttribute('data-index')

      const endElement = selected.focusNode?.parentElement
      const endElementIndex = endElement?.getAttribute('data-index')

      if (startElementIndex && endElementIndex) {
        const indexRange = [parseInt(startElementIndex), parseInt(endElementIndex)]
        for (let i = indexRange[0]; i <= indexRange[1]; i++) {
          const element = document.querySelector(`[data-index="${i}"]`)
          if (!element || !element.textContent) {
            continue
          }

          const backRef = JSON.parse(element.getAttribute('data-backref') || '{}')
          let sliceRange: number[] = [0, 0]
          if (i === indexRange[0]) {
            sliceRange = [
              selected.anchorOffset,
              indexRange[0] === indexRange[1]
                ? selected.focusOffset
                : element.textContent.length,
            ]
          } else if (i === indexRange[1]) {
            sliceRange = [0, selected.focusOffset]
          } else {
            sliceRange = [0, element.textContent.length]
          }

          const highlight = element.textContent.slice(...sliceRange)
          element.innerHTML = element.textContent.replace(
            highlight,
            `<span class="comment-tmp bg-yellow-400">${highlight}</span>`,
          )
          metadata.md_nodes.push({
            ...backRef,
            anchor_offset: sliceRange[0],
            focus_offset: sliceRange[1],
          })
        }
      }
    }

    // Update selection state
    selected?.removeAllRanges()
    setSelection((state) => ({
      ...state,
      show: getSelectedElements().length > 0,
      position,
      metadata,
    }))
  }

  const setCommentedSelection = useCallback(() => {
    threads.items.forEach(({ id, isResolved, md_metadata }) => {
      md_metadata.md_nodes.forEach((node: any) => {
        const searchAttr = JSON.stringify({ start: node.start, end: node.end })
        const element = document.querySelector(`[data-backref='${searchAttr}']`)
        if (element && element.textContent) {
          // If element is selected by user, replace classname,
          // if already selected, check resolved,
          // otherwise wrap slice into selection
          const selectedTmp = element.querySelector('.comment-tmp')
          const selected = element.querySelector('.comment')
          if (selectedTmp) {
            selectedTmp.classList.remove('comment-tmp', 'bg-yellow-400')
            selectedTmp.classList.add('comment', 'bg-yellow-200', 'cursor-pointer')
            selectedTmp.setAttribute('data-thread', id)
          } else if (selected) {
            if (isResolved && selected.textContent) {
              element.innerHTML = element.innerHTML.replace(
                selected.outerHTML,
                selected.textContent,
              )
            }
          } else {
            const slice = element.textContent.slice(node.anchor_offset, node.focus_offset)
            element.innerHTML = element.innerHTML.replace(
              slice,
              `<span class="comment bg-yellow-200 cursor-pointer" data-thread="${id}">${slice}</span>`,
            )
          }
        }
      })
    })
  }, [threads.items.length, threads.items.filter(({ isResolved }) => !isResolved).length])

  const renderMdImages = useCallback(async () => {
    if (extension !== 'md') {
      return
    }

    // Collect all img tags
    const imageElements = document.querySelectorAll('.markdown-body img')
    await Promise.all(
      Array.from(imageElements).map(async (element) => {
        const src = element.getAttribute('src')
        if (src && src.startsWith(document.location.origin)) {
          const fullpath = decodeURI(src.split('/view/')[1])
          const branch = await repository.adapter.getBranch(fullpath.split('/')[0])
          const path = fullpath.replace(`${branch.name}/`, '')
          const tree = await repository.adapter.getTree(branch.commit.name, path)
          const item = tree.items.find((item: any) => getTreeItemFullPath(item) === path)
          if (item) {
            const snapshot = await repository.adapter.getBlob({
              fullpath: `${item.commit}/${path}`,
              commit: branch.commit.name,
            })
            const ext = (item.name.split('.').slice(-1)[0] || 'png').toLowerCase()
            if (Buffer.isBuffer(snapshot.content)) {
              const base64 = `data:image/${ext};base64,${snapshot.content.toString('base64')}`
              element.setAttribute('src', base64)
            }
          }
        }
      }),
    )
  }, [extension])

  const onCommentHover = (e: Event) => {
    const target = e.target as Element
    const threadId = target.getAttribute('data-thread')
    if (threadId) {
      hoverThread(threadId, e.type === 'mouseenter')
    }
  }

  const onCommentClick = (e: Event) => {
    const target = e.target as Element
    const threadId = target.getAttribute('data-thread')
    if (threadId) {
      toggleThread(threadId)
    }
  }

  const submitCommentForm = async (
    values: { comment: string },
    helpers: FormikHelpers<any>,
  ) => {
    try {
      if (!address) {
        throw new GoshError('Add comment error', 'Blob address undefined')
      }

      await submitComment({
        content: values.comment,
        metadata: {
          md_metadata: selection.metadata,
          commit,
          snapshot: address,
        },
      })
      helpers.resetForm()
      setSelection((state) => ({ ...state, show: false, position: [], metadata: null }))
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    setCommentedSelection()

    document.querySelectorAll('.comment').forEach((element) => {
      element.addEventListener('mouseenter', onCommentHover)
      element.addEventListener('mouseleave', onCommentHover)
      element.addEventListener('click', onCommentClick)
    })

    return () => {
      document.querySelectorAll('.comment').forEach((element) => {
        element.removeEventListener('mouseenter', onCommentHover)
        element.removeEventListener('mouseleave', onCommentHover)
        element.removeEventListener('click', onCommentClick)
      })
    }
  }, [setCommentedSelection])

  useEffect(() => {
    // renderMdImages()
  }, [renderMdImages])

  if (!semanticTree) {
    return <p className="text-gray-606060 p-3 text-sm">Binary data not shown</p>
  }
  if (extension === 'md') {
    return (
      <div className={classNames(className)}>
        <SelectionCommentBlock
          show={selection.show}
          position={selection.position}
          onSubmit={submitCommentForm}
        />

        <div
          className="markdown-body px-4 py-4"
          onMouseUp={setTextSelection}
          onMouseDown={resetTextSelection}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            urlTransform={(value) => value}
            mdast={semanticTree}
            remarkRehypeOptions={{
              unknownHandler: (_, node) => {
                return {
                  type: 'element',
                  tagName: 'span',
                  properties: {
                    ['data-backref']: JSON.stringify(node.position),
                    ['data-index']: node.index,
                  },
                  children: node.children,
                }
              },
            }}
          />
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-x-scroll">
      <SelectionCommentBlock
        show={selection.show}
        position={selection.position}
        onSubmit={submitCommentForm}
      />

      <table
        className="code-table w-full text-xs"
        onMouseUp={setTextSelection}
        onMouseDown={resetTextSelection}
      >
        <tbody>
          {semanticTree.children.map((node: any, index) => {
            const number = index + 1
            const content =
              !node.value || node.value === '</span>'
                ? '&nbsp;'
                : `<span data-backref='${JSON.stringify(node.position)}' data-index="${number}">${node.value}</span>`
            return (
              <tr key={index} id={`code-line-${number}`}>
                <LineNumber num={number} />
                <LineContent content={content} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const SelectionCommentBlock = (props: {
  show: boolean
  position: number[]
  onSubmit(
    values: TCommentFormValues,
    helpers: FormikHelpers<TCommentFormValues>,
  ): Promise<void>
}) => {
  const { show, position, onSubmit } = props
  const [formOpened, setFormOpened] = useState<boolean>(false)

  const handleToggleForm = () => {
    setFormOpened(!formOpened)
  }

  useEffect(() => {
    if (!show) {
      setFormOpened(false)
    }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute"
          style={{ left: position[0], top: position[1] - 32 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <div className="relative">
            <Button
              variant="custom"
              className="relative !rounded-full w-8 h-8 !p-0 overflow-clip z-1 hover:opacity-90
              transition-opacity duration-200"
              onClick={handleToggleForm}
            >
              <img src={CommentImg} className="w-full" />
            </Button>

            <AnimatePresence mode="wait">
              {formOpened && (
                <motion.div
                  className="border rounded-md bg-white -translate-y-5 translate-x-3 overflow-clip w-screen max-w-sm"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                >
                  <CommentForm onSubmit={onSubmit} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default BlobPreview
