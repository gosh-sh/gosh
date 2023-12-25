import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../../../pages/RepoLayout'
import * as Yup from 'yup'
import { Field, Form, Formik } from 'formik'
import DockerClient from '../../client'
import { useBranches, AppConfig } from 'react-gosh'
import { BranchSelect } from '../../../components/Branches'
import { FormikInput } from '../../../components/Formik'
import { Button } from '../../../components/Form'

type TBuildFormValues = {
  tag: string
  imageDockerfile: string
}

const BuildPage = () => {
  const { daoName, repoName, branchName = 'main' } = useParams()
  const navigate = useNavigate()
  const { repository } = useOutletContext<TRepoLayoutOutletContext>()
  const { branches, branch, updateBranch } = useBranches(repository.adapter, branchName)
  const [output, setOutput] = useState('')

  const isDisabled = false

  const appendLog = (...args: string[]) => {
    console.log('appendLog', args)
    setOutput((output) => {
      if (output.length === 0) {
        return args.join('\n')
      } else {
        return [output, ...args].join('\n')
      }
    })
  }

  const onBuild = async (values: TBuildFormValues, { setSubmitting }: any) => {
    setOutput('')
    if (!!branch) {
      const commit = await repository.adapter.getCommit({
        address: branch.commit.address,
      })

      const addr = AppConfig.versions[repository.details.version]
      await DockerClient.buildImage(
        `gosh://${addr}/${daoName}/${repoName}`,
        commit.name,
        values.imageDockerfile,
        values.tag,
        appendLog,
      )
    } else {
      console.error(`Error: branch has no commit address`)
    }
    setSubmitting(false)
    return
  }

  useEffect(() => {
    if (branch?.name) updateBranch(branch.name)
  }, [branch?.name, updateBranch])
  return (
    <div className="bordered-block px-7 py-8">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
        <div className="grow flex items-center gap-y-2 gap-x-5">
          <BranchSelect
            branch={branch}
            branches={branches}
            onChange={(selected) => {
              if (selected) {
                navigate(`/o/${daoName}/r/${repoName}/build/${selected.name}`)
              }
            }}
          />
        </div>
      </div>
      <div className="mt-5">
        <div className="text-lg">
          Build Docker image on
          <span className="font-semibold mx-2">{branch?.name}</span>
        </div>
        <Formik
          initialValues={{
            tag: `${repoName}:${branch?.name ?? 'latest'}`,
            imageDockerfile: 'Dockerfile',
          }}
          onSubmit={onBuild}
          validationSchema={Yup.object().shape({
            tag: Yup.string().required('Field is required'),
            imageDockerfile: Yup.string().required('Field is required'),
          })}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="mt-5">
                <Field
                  name="tag"
                  component={FormikInput}
                  className="w-full"
                  autoComplete="off"
                  placeholder="Image tag"
                  disabled={isSubmitting || isDisabled}
                />
              </div>
              <div className="mt-5">
                <Field
                  name="imageDockerfile"
                  component={FormikInput}
                  className="w-full"
                  autoComplete="off"
                  placeholder="Image dockerfile path"
                  disabled={isSubmitting || isDisabled}
                />
              </div>
              {/* <div className="mt-5">
                                <Field
                                    name="pushImage"
                                    component={SwitchField}
                                    className="ml-4"
                                    label="Push image after build"
                                    labelClassName="text-sm text-gray-505050"
                                    disabled={isSubmitting || isDisabled}
                                />
                            </div> */}
              <div className="flex flex-wrap mt-4 items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || isDisabled}
                  // isLoading={isSubmitting}
                >
                  Build
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
      {output.length > 0 && (
        <div className="mt-5">
          <pre>{output}</pre>
        </div>
      )}
    </div>
  )
}

export default BuildPage
