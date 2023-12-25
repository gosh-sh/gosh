import { useState } from 'react'
import { faFile } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { useBranches, useTree } from 'react-gosh'
import Loader from '../../components/Loader'

const GotoPage = () => {
  const { daoName, repoName, branchName = 'main' } = useParams()
  const { repository } = useOutletContext<TRepoLayoutOutletContext>()
  const { branch } = useBranches(repository.adapter, branchName)
  const { tree, blobs } = useTree(daoName!, repoName!, branch?.commit)
  const [search, setSearch] = useState<string>('')

  return (
    <>
      <div className="flex items-center mb-3">
        <Link
          to={`/o/${daoName}/r/${repoName}/tree/${branchName}`}
          className="text-extblue font-medium hover:underline"
        >
          {repoName}
        </Link>
        <span className="mx-2">/</span>
        <div className="input grow">
          <input
            type="text"
            className="element !py-1.5 !text-sm"
            placeholder="Search file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!tree && <Loader className="text-sm">Loading tree items...</Loader>}
      <div className="divide-y divide-gray-e6edff">
        {blobs?.map((item, index) => {
          const path = `${item.path ? `${item.path}/` : ''}${item.name}`
          return (
            <div key={index} className="flex gap-x-4 py-3">
              <Link
                className="text-sm hover:underline"
                to={`/o/${daoName}/r/${repoName}/blobs/view/${branchName}/${path}`}
              >
                <FontAwesomeIcon className="mr-2" icon={faFile} fixedWidth />
                {path}
              </Link>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default GotoPage
