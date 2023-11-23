import React from 'react'
import { Link } from 'react-router-dom'

type TRepoPathProps = {
    daoName?: string
    repoName?: string
    branchName?: string
    pathName?: string
    pathOnly?: boolean
    isBlob?: boolean
}

const RepoBreadcrumbs = (props: TRepoPathProps) => {
    const {
        daoName = '',
        repoName = '',
        branchName = 'main',
        pathName = '',
        pathOnly = false,
        isBlob = true,
    } = props

    let paths = pathName.split('/')
    if (pathOnly) {
        paths = paths.slice(0, -1)
    }

    return (
        <>
            {[repoName, ...paths].map((path, index, array) => {
                const part = index > 0 ? array.slice(1, index + 1).join('/') : ''
                if (index > 0 && !path) {
                    return null
                }
                if (!pathOnly && isBlob && index === array.length - 1) {
                    return (
                        <React.Fragment key={index}>
                            <span className="font-medium">{path}</span>
                        </React.Fragment>
                    )
                }
                return (
                    <React.Fragment key={index}>
                        <Link
                            to={`/o/${daoName}/r/${repoName}/tree/${branchName}/${part}`}
                            className="text-extblue font-medium hover:underline"
                        >
                            {path}
                        </Link>
                        {array[index + 1] && <span className="mx-2">/</span>}
                    </React.Fragment>
                )
            })}
        </>
    )
}

export default RepoBreadcrumbs
