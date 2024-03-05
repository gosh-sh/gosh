import isUtf8 from 'isutf8'
import { useEffect } from 'react'
import { GoshAdapterFactory, sha1, unixtimeWithTz } from 'react-gosh'
import { useNavigate } from 'react-router-dom'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { ZERO_COMMIT } from '../../constants'
import { GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { EDaoEventType } from '../../types/common.types'
import { readFileAsBuffer } from '../../utils'
import { getSystemContract } from '../blockchain/helpers'
import { ic_create_atom } from '../store/ic.state'
import { TTaskAssignerData } from '../types/dao.types'
import { EICCreateStep, TICCreateState, TICCreateStateForm } from '../types/ic.types'
import { useCreateTask, useDao, useDaoMember } from './dao.hooks'
import { useUser } from './user.hooks'

export function useCreateIC(params: { initialize?: boolean } = {}) {
  const working_branch = 'dev'
  const { initialize } = params

  const [state, setState] = useRecoilState(ic_create_atom)
  const resetState = useResetRecoilState(ic_create_atom)
  const navigate = useNavigate()
  const { getCalculatedGrant } = useCreateTask()
  const { user } = useUser()
  const dao = useDao()
  const member = useDaoMember()
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__createic'))

  const setStep = (step: EICCreateStep, params?: Object) => {
    setState((state) => ({ ...state, step: { name: step, params: params || {} } }))
  }

  const submitRoles = (params: { roles: TICCreateState['roles'] }) => {
    setState((state) => ({
      ...state,
      roles: params.roles,
      step: { name: EICCreateStep.REWARDS, params: {} },
    }))
  }

  const submitRewards = (task: TICCreateState['task']) => {
    setState((state) => ({
      ...state,
      task,
      step: { name: EICCreateStep.REPOSITORY, params: {} },
    }))
  }

  const submitRepository = (params: { name: string; description?: string }) => {
    setState((state) => ({
      ...state,
      repository: params,
      step: { name: EICCreateStep.DOCUMENTS, params: {} },
    }))
  }

  const sumbitDocuments = (files: File[]) => {
    setState((state) => ({
      ...state,
      documents: [...state.documents, ...files],
    }))
  }

  const updateApplicationFormFields = (form: TICCreateStateForm, index: number) => {
    setState((state) => ({
      ...state,
      forms: state.forms.map((f, i) => (i !== index ? f : form)),
    }))
  }

  const updateApplicationFormValues = (
    values: { [name: string]: string },
    index: number,
  ) => {
    setState((state) => ({
      ...state,
      forms: state.forms.map((form, i) => {
        const fields = [...form.form.fields]
        if (i === index) {
          Object.keys(values).map((name) => {
            const found_index = fields.findIndex((field) => field.name === name)
            if (found_index >= 0) {
              fields[found_index] = { ...fields[found_index], value: values[name] }
            }
          })
        }
        return { ...form, form: { ...form.form, fields } }
      }),
    }))
  }

  const submitApplicationForm = async (
    values: { [name: string]: string },
    index: number,
  ) => {
    updateApplicationFormValues(values, index)

    if (index + 1 < state.forms.length) {
      setState((state) => ({
        ...state,
        step: { name: EICCreateStep.FORMS, params: { index: index + 1 } },
      }))
    } else {
      const { eventaddr } = await submitFlow()
      navigate(`/o/${dao.details.name}/events/${eventaddr}`)
    }
  }

  const submitFlow = async () => {
    const branch_name = 'dev'

    try {
      // Get create repository cell params
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Generate create repository cell',
      }))
      const create_repo_params = await _getCreateRepositoryCellParams()

      // Get update repository metadata cell params
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Generate update repository metadata cell',
      }))
      const update_repo_metadata_params = await _getUpdateRepositoryMetadataCellParams()

      // Get create task cell params
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Generate create task cell',
      }))
      const create_task_params = await _getCreateTaskCellParams()

      // Push commit and get PR cell params
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Generate repository PR cell',
      }))
      const push_repo_params = await _getPushRepositoryCellParams()

      // Create multi event
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Create DAO multi event',
      }))
      const eventaddr = await member.wallet!.createMultiEvent({
        proposals: [
          ...create_repo_params,
          update_repo_metadata_params,
          create_task_params,
          { type: EDaoEventType.DELAY, params: {} },
          push_repo_params,
        ],
        comment: `Create IC (repository: ${state.repository?.name})`,
      })

      setStatus((state) => ({
        ...state,
        type: 'success',
        data: {
          title: 'Create IC',
          content: 'DAO event created',
        },
      }))

      return { eventaddr }
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    }
  }

  const _getCreateRepositoryCellParams = async () => {
    const { repository } = state

    if (!repository) {
      throw new GoshError('CreateRepository', 'Repository undefined')
    }

    const account = await getSystemContract().getRepository({
      path: `${dao.details.name}/${repository.name}`,
    })
    if (await account.isDeployed()) {
      throw new GoshError('CreateRepository', {
        message: 'Repository already exists',
        repository: repository.name,
      })
    }

    return [
      {
        type: EDaoEventType.REPO_CREATE,
        params: {
          name: repository.name,
          description: repository.description,
        },
      },
      { type: EDaoEventType.DELAY, params: {} },
      {
        type: EDaoEventType.BRANCH_CREATE,
        params: {
          repo_name: repository.name,
          branch_name: working_branch,
          from_commit: ZERO_COMMIT,
          comment: 'Create working branch',
        },
      },
      {
        type: EDaoEventType.BRANCH_LOCK,
        params: {
          repo_name: repository.name,
          branch_name: 'main',
          comment: `Protect main branch`,
        },
      },
    ]
  }

  const _getUpdateRepositoryMetadataCellParams = async () => {
    const { repository, roles } = state

    if (!repository) {
      throw new GoshError('UpdateRepositoryMetadata', 'Repository undefined')
    }

    return {
      type: EDaoEventType.REPO_UPDATE_METADATA,
      params: {
        reponame: repository.name,
        metadata: {
          ic: true,
          roles: {
            scientist: roles.scientist.map(({ value }) => value.address),
            developer: roles.developer.map(({ value }) => value.address),
            issuer: roles.issuer.map(({ value }) => value.address),
          },
          working_branch,
        },
      },
    }
  }

  const _getCreateTaskCellParams = async () => {
    const { task, repository, roles } = state

    if (!task) {
      throw new GoshError('CreateTask', 'Task data undefined')
    }
    if (!repository) {
      throw new GoshError('CreateTask', 'Repository undefined')
    }

    const account = await getSystemContract().getTask({
      data: {
        daoname: dao.details.name!,
        reponame: repository.name,
        taskname: task.name,
      },
    })
    if (await account.isDeployed()) {
      throw new GoshError('CreateTask', {
        message: 'Task already exists',
        name: task.name,
      })
    }

    const grant = getCalculatedGrant({
      cost: task.reward,
      assign: task.scientist,
      review: 0,
      manager: task.issuer,
      lock: task.lock,
      vesting: task.vesting,
    })

    const team: TTaskAssignerData = {
      taskaddr: account.address,
      assigner: Object.fromEntries(
        roles.scientist.map(({ value }) => [value.address, true]),
      ),
      reviewer: {},
      manager: Object.fromEntries(roles.issuer.map(({ value }) => [value.address, true])),
      daomember: {},
    }

    return {
      type: EDaoEventType.TASK_CREATE,
      params: {
        reponame: repository.name,
        taskname: task.name,
        config: grant,
        team,
        tags: [],
        comment: task.comment,
      },
    }
  }

  const _getPushRepositoryCellParams = async () => {
    const { repository } = state

    if (!repository) {
      throw new GoshError('PushRepository', 'Repository undefined')
    }

    // Setup react-gosh repository
    const _gosh = GoshAdapterFactory.create(dao.details.version!)
    const _repo = await _gosh.getRepository({
      path: `${dao.details.name}/${repository.name}`,
    })
    _repo.auth = { username: user.username, wallet0: member.wallet }
    _repo.name = repository.name

    // Generate and push commit without setCommit
    // Create blobs data
    const blobs: {
      treepath: string[]
      original: string | Buffer
      modified: string | Buffer
    }[] = []

    state.forms.forEach((item) => {
      blobs.push({
        treepath: ['', `forms/${item.filename}`],
        original: '',
        modified: JSON.stringify(item.form, undefined, 2),
      })
    })

    await Promise.all(
      state.documents.map(async (file) => {
        let content: string | Buffer = await readFileAsBuffer(file)
        if (isUtf8(content)) {
          content = Buffer.from(content).toString()
        }
        blobs.push({
          treepath: ['', `documents/${file.name}`],
          original: '',
          modified: content,
        })
      }),
    )

    const branch_tree = { tree: '', items: [] }
    const blobs_data = await Promise.all(
      blobs.map(async (blob) => {
        return await _repo.getBlobPushDataOut(branch_tree.items, blob)
      }),
    )

    // Create future tree
    const future_tree = await _repo.getTreePushDataOut(
      branch_tree.items,
      blobs_data.flat(),
    )

    // Create future commit
    const commit_email = `${user.username!.replace('@', '')}@gosh.sh`
    const commit_string = [
      `tree ${future_tree.sha1}`,
      `author ${user.username} <${commit_email}> ${unixtimeWithTz()}`,
      `committer ${user.username} <${commit_email}> ${unixtimeWithTz()}`,
      '',
      `Initialize IC repository`,
    ]
      .filter((item) => item !== null)
      .join('\n')
    const commit_hash = sha1(commit_string, 'commit', 'sha1')
    const commit_parent = {
      address: await _gosh.getCommitAddress({
        repo_addr: _repo.getAddress(),
        commit_name: ZERO_COMMIT,
      }),
      version: _repo.getVersion(),
    }

    // Update commit sha1 in future tree items, and recalculate tree hashes
    future_tree.updated.forEach((key) => {
      future_tree.tree[key].forEach((item) => (item.commit = commit_hash))
    })
    future_tree.tree = await _repo.updateSubtreesHashOut(future_tree.tree)
    future_tree.sha256 = await _repo.getTreeSha256Out({ items: future_tree.tree[''] })

    // Deploy future commit and etc.
    await _repo.deployCommitOut(
      working_branch,
      commit_hash,
      commit_string,
      [commit_parent],
      future_tree.sha256,
      false,
    )
    await Promise.all(
      future_tree.updated.map(async (path) => {
        await _repo.deployTreeOut(future_tree.tree[path])
      }),
    )

    await Promise.all(
      blobs_data.flat().map(async ({ data }) => {
        const { treepath, content } = data
        await _repo.deploySnapshotOut(commit_hash, treepath, content)
      }),
    )

    return {
      type: EDaoEventType.PULL_REQUEST,
      params: {
        repo_name: _repo.name,
        branch_name: working_branch,
        commit_name: commit_hash,
        num_files: 0,
        num_commits: 1,
        comment: 'Initialize IC repository',
      },
    }
  }

  useEffect(() => {
    return () => {
      if (initialize) {
        resetState()
      }
    }
  }, [initialize])

  return {
    state,
    status,
    setStep,
    submitRoles,
    submitRewards,
    submitRepository,
    sumbitDocuments,
    updateApplicationFormFields,
    updateApplicationFormValues,
    submitApplicationForm,
    submitFlow,
  }
}
