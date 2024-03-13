import { useCallback, useEffect, useState } from 'react'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { TApplicationForm, TFormGeneratorForm } from '../types/form.types'

export function useApplicationFormList(params: {
  initialize?: boolean
  repo_address: string
  repo_adapter: IGoshRepositoryAdapter
  branch?: string
}) {
  const { initialize, repo_address, repo_adapter, branch } = params
  const [state, setState] = useState<{
    is_fetching: boolean
    forms: {
      repo_adapter: IGoshRepositoryAdapter
      branch: string
      application_form: TApplicationForm
    }[]
  }>({ is_fetching: false, forms: [] })

  const getForms = useCallback(
    async (params: { branch_name: string }) => {
      const { branch_name } = params
      const commit = (await repo_adapter.getBranch(branch_name)).commit
      const tree = await repo_adapter.getTree(commit, 'forms')
      return await Promise.all(
        tree.tree.forms.map(async (item) => {
          const filename = `${item.path}/${item.name}`
          const snapshot = await repo_adapter._getSnapshot({
            fullpath: `${item.commit}/${filename}`,
          })
          const { current } = await repo_adapter.getCommitBlob(
            snapshot.address,
            filename,
            commit.name,
          )
          return {
            repo_adapter,
            branch: branch_name,
            application_form: {
              filename,
              form: JSON.parse(current as string) as TFormGeneratorForm,
            },
          }
        }),
      )
    },
    [repo_address],
  )

  const updateFormList = useCallback(async () => {
    setState((state) => ({ ...state, is_fetching: true }))

    let branch_name = branch
    if (!branch_name) {
      const repo_details = await repo_adapter.getDetails()
      branch_name = repo_details.metadata!.forms_branch
    }
    const forms = await getForms({ branch_name: branch_name! })

    setState((state) => ({ ...state, forms, is_fetching: false }))
  }, [repo_address])

  useEffect(() => {
    if (initialize) {
      updateFormList()
    }
  }, [initialize, updateFormList])

  return { data: state, getForms, updateFormList }
}

export function useApplicationForm(params: {
  form_filename: string
  repo_adapter: IGoshRepositoryAdapter
  branch: string
}) {
  const { form_filename, repo_adapter, branch } = params
  const [state, setState] = useState<{
    is_fetching: boolean
    application_form: TApplicationForm | null
  }>({ is_fetching: false, application_form: null })

  const getForm = useCallback(async () => {
    setState((state) => ({ ...state, is_fetching: true }))

    const commit = (await repo_adapter.getBranch(branch)).commit
    const tree = await repo_adapter.getTree(commit, 'forms')
    const tree_item = tree.items.find((item) => {
      const filename = `${item.path}/${item.name}`
      return filename === form_filename
    })
    if (!!tree_item) {
      const snapshot = await repo_adapter._getSnapshot({
        fullpath: `${tree_item.commit}/${form_filename}`,
      })
      const { current } = await repo_adapter.getCommitBlob(
        snapshot.address,
        form_filename,
        commit.name,
      )
      setState((state) => ({
        ...state,
        application_form: {
          filename: form_filename,
          form: JSON.parse(current as string),
        },
      }))
    }

    setState((state) => ({ ...state, is_fetching: false }))
  }, [form_filename])

  useEffect(() => {
    getForm()
  }, [getForm])

  return state
}
