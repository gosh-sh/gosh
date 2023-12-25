import { Editable, useEditor } from '@wysimark/react'
import classNames from 'classnames'
import aiLogo from '../../assets/images/ai-logo.svg'
import aiComplete from '../../assets/images/ai-complete.svg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperclip } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Field, Form, Formik } from 'formik'
import { FormikInput } from '../../components/Formik'
import { Button } from '../../components/Form'
import yup from '../../yup-extended'
import { toast } from 'react-toastify'
import { ToastError } from '../../components/Toast'
import { faEnvelope } from '@fortawesome/free-regular-svg-icons'
import { getIdenticonAvatar, supabase } from '../../helpers'
import { GoshAdapterFactory, GoshError, useDaoCreate, useUser } from 'react-gosh'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/Alert/Alert'

type TAiPromptCompleteProps = React.HTMLAttributes<HTMLDivElement> & {
  daoName: string
  email?: string
}

const AiPromptComplete = (props: TAiPromptCompleteProps) => {
  const { className, daoName, email } = props
  const navigate = useNavigate()

  return (
    <div
      className={classNames(
        'flex flex-wrap items-center justify-around gap-6',
        className,
      )}
    >
      <div className="basis-auto grow-0">
        <div className="max-w-[25rem]">
          <img src={aiComplete} alt="image" className="w-full" />
        </div>
      </div>
      <div className="basis-auto grow-0">
        <h3 className="text-3xl font-medium">Your code is being processed</h3>
        <div className="mt-2 text-gray-53596d text-sm">
          When it is ready it will be there
        </div>
        <div
          className={classNames(
            'mt-6 p-5 border border-gray-e6edff rounded-xl',
            'group flex flex-nowrap hover:bg-gray-fafafd',
            'cursor-pointer transition-all',
          )}
          onClick={() => navigate(`/o/${daoName}`)}
        >
          <div className="grow">
            <div className="text-xl font-medium group-hover:text-blue-2b89ff transition-all">
              {daoName}
            </div>
            <div className="mt-2 text-sm text-gray-53596d">GoshAI organization</div>
          </div>
          <div>
            <div className="w-[3.375rem]">
              <img
                className="w-full"
                src={getIdenticonAvatar({
                  seed: 'daoname',
                }).toDataUriSync()}
                alt="avatar"
              />
            </div>
          </div>
        </div>
        {email && (
          <div className="mt-12 py-6 border-t border-t-gray-e6edff text-sm text-gray-53596d">
            <FontAwesomeIcon icon={faEnvelope} className="mr-4" size="lg" />
            And we will notify you to {email}
          </div>
        )}
      </div>
    </div>
  )
}

const AiPromptPage = () => {
  const { user } = useUser()
  const { create: createDao } = useDaoCreate()
  const editor = useEditor({
    minHeight: 570,
  })
  const [showUpload, setShowUpload] = useState<boolean>(true)
  const [complete, setComplete] = useState<{
    isReady: boolean
    daoName: string
    email?: string
  }>({ isReady: false, daoName: '' })

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0)
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.readAsText(file, 'utf8')
    reader.onload = (ev) => {
      const data = ev.target?.result
      if (typeof data === 'string') {
        editor.resetMarkdown(data)
      }
      e.target.value = ''
    }
  }

  const onFormSubmit = async (values: { repo_name: string; email: string }) => {
    const { repo_name, email } = values
    const daoName = `${user.username}-ai`
    try {
      const gosh = GoshAdapterFactory.createLatest()
      const daoProfile = await gosh.getDaoProfile({ name: daoName })
      if (!(await daoProfile.isDeployed())) {
        await createDao(daoName, { tags: ['GoshAI'] })
      }

      const dao = await gosh.getDao({ name: daoName, useAuth: true })
      if (!(await dao.isDeployed())) {
        throw new GoshError(
          'DAO not exist',
          `DAO '${daoName}' not exist. You should create it or upgrade if exists`,
        )
      }

      const isMember = await dao.isMember({ profile: user.profile! })
      if (!isMember) {
        throw new GoshError('Accesss denied', `You are not a member of DAO '${daoName}'`)
      }

      const members = await dao.getMembers()
      const repo = await dao.getRepository({ name: repo_name })
      if (!(await repo.isDeployed())) {
        if (members.length === 1) {
          await dao.createRepository({ name: repo_name, alone: true })
        } else {
          throw new GoshError(
            'Repository not exist',
            `You should create repository '${repo_name}' first`,
          )
        }
      }

      const aiUsername = import.meta.env.REACT_APP_GOSHAI_NAME
      const aiUser = { name: aiUsername, type: 'user' }
      const isAiMember = await dao.isMember({ user: aiUser })
      if (!isAiMember) {
        if (members.length === 1) {
          await dao.createMember({
            alone: true,
            members: [{ user: aiUser, allowance: 0, comment: '', expired: 0 }],
          })
        } else {
          throw new GoshError(
            'gosh-ai is not a member',
            `You should add 'gosh-ai' to DAO '${daoName}' members`,
          )
        }
      }

      const { error } = await supabase.from('gosh_ai').insert({
        spec: editor.getMarkdown(),
        dao_name: daoName,
        repo_name,
        repo_url: `gosh://${gosh.gosh.address}/${daoName}/${repo_name}`,
        email,
        is_completed: false,
      })
      if (error) {
        throw new GoshError('Save spec error', error.message)
      }

      setComplete({ isReady: true, daoName, email })
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  return (
    <div className="container py-10 relative">
      {complete.isReady && (
        <div className="container py-24 absolute w-full h-full left-0 top-0 bg-white z-10">
          <AiPromptComplete {...complete} />
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-y-6 gap-x-12">
        <div className="basis-0 grow relative overflow-x-auto md:overflow-x-visible">
          <Alert variant="warning" className="mb-4">
            This is an Alpha Version of GOSH.AI. Currently supporting only Async Solidity.
            The model training is ongoing. As such it may take a very long time (sometimes
            many hours depending on the prompt) to generate a response. It may fail as
            well. We are continuously improving the model. Thank you for understanding.
          </Alert>

          <Editable
            editor={editor}
            placeholder="Write something..."
            onChange={() => {
              setShowUpload(!editor.getMarkdown().length)
            }}
          />
          <div
            className={classNames(
              'absolute left-0 bottom-0 h-[75%] w-full p-9',
              !showUpload ? 'hidden' : null,
            )}
          >
            <div className="text-center">
              <div className="w-[4.875rem] mx-auto">
                <img src={aiLogo} alt="image" className="w-full" />
              </div>
              <div className="text-3xl font-medium mt-2">GoshAI</div>
            </div>
            <div className="mt-4 text-sm text-center md:max-w-[70%] mx-auto">
              To get started with GOSH.AI, upload your Spec.MD file with a description of
              your project, answer questions GOSH.AI might have and wait for first Pull
              Request from a team of GOSH Artificial Intelligence Models which will work
              for you to write, test and deploy your project
            </div>
            <div className="mt-8 text-center">
              <label
                className={classNames(
                  'px-6 py-2 bg-gray-fafafd border rounded-xl',
                  'text-sm text-gray-7c8db5 cursor-pointer border-transparent',
                  'hover:border-black hover:text-black transition-all',
                )}
              >
                <input
                  type="file"
                  name="input-name"
                  className="hidden"
                  accept=".md"
                  onChange={onFileUpload}
                />
                <span>
                  <FontAwesomeIcon icon={faPaperclip} className="mr-2" />
                  Attach SPEC.MD file
                </span>
              </label>
            </div>
          </div>
        </div>
        <div>
          <div
            className={classNames(
              'max-w-[23.75rem] overflow-hidden',
              'border border-gray-e6edff rounded-xl',
            )}
          >
            <Formik
              initialValues={{ repo_name: '', email: '' }}
              validationSchema={yup.object().shape({
                repo_name: yup.string().reponame().required(),
                email: yup.string().email(),
              })}
              onSubmit={onFormSubmit}
            >
              {({ isSubmitting }) => (
                <Form>
                  <div className="px-4 py-6">
                    <div>
                      <Field
                        name="repo_name"
                        component={FormikInput}
                        autoComplete="off"
                        placeholder="Choose repository name"
                        disabled={isSubmitting || !editor.getMarkdown().length}
                      />
                    </div>
                    <div className="mt-4">
                      <Button
                        type="submit"
                        size="xl"
                        className="w-full"
                        disabled={isSubmitting || !editor.getMarkdown().length}
                        isLoading={isSubmitting}
                      >
                        Develop code
                      </Button>
                    </div>
                  </div>
                  <div
                    className={classNames(
                      'transition-all duration-300',
                      editor.getMarkdown().length
                        ? 'max-h-screen opacity-100'
                        : 'max-h-0 opacity-0',
                    )}
                  >
                    <div className="px-4 py-6 bg-gray-fafafd">
                      <div>
                        <Field
                          name="email"
                          component={FormikInput}
                          autoComplete="off"
                          placeholder="Email"
                          className="bg-white"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="mt-4 text-gray-53596d text-sm text-center w-9/12 mx-auto">
                        Leave your email and we will notify you when your code is ready
                      </div>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiPromptPage
