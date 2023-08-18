import { debounce } from 'lodash'
import * as yup from 'yup'
import { AnyObject, Maybe } from 'yup/lib/types'
import { validateDaoName, validateRepoName, validateUsername } from './validators'
import { AppConfig } from '../appconfig'

const _debounceDaoExists = debounce(async (value, resolve) => {
    try {
        const profile = await AppConfig.goshroot.getDaoProfile(value.toLowerCase())
        const exists = await profile.isDeployed()
        resolve(!exists)
    } catch (e: any) {
        console.error(e.message)
        resolve(false)
    }
}, 500)

yup.addMethod<yup.StringSchema>(yup.string, 'username', function () {
    return this.test('test-username', 'Invalid username', function (value) {
        const { path, createError } = this
        if (!value) {
            return true
        }

        const { valid, reason } = validateUsername(value)
        return valid ? true : createError({ path, message: reason })
    })
})

yup.addMethod<yup.StringSchema>(yup.string, 'daoname', function () {
    return this.test('test-daoname', 'Invalid DAO name', function (value) {
        const { path, createError } = this
        if (!value) {
            return true
        }

        const { valid, reason } = validateDaoName(value)
        return valid ? true : createError({ path, message: reason })
    })
})

yup.addMethod<yup.StringSchema>(yup.string, 'daoexists', function () {
    return this.test('test-daoexists', 'DAO name is already taken', async (value) => {
        if (!value) {
            return true
        }
        return new Promise((resolve) => _debounceDaoExists(value, resolve))
    })
})

yup.addMethod<yup.StringSchema>(yup.string, 'reponame', function () {
    return this.test('test-reponame', 'Invalid repository name', function (value) {
        const { path, createError } = this
        if (!value) {
            return true
        }

        const { valid, reason } = validateRepoName(value)
        return valid ? true : createError({ path, message: reason })
    })
})

declare module 'yup' {
    interface StringSchema<
        TType extends Maybe<string> = string | undefined,
        TContext extends AnyObject = AnyObject,
        TOut extends TType = TType,
    > extends yup.BaseSchema<TType, TContext, TOut> {
        username(): StringSchema<TType, TContext>
        daoname(): StringSchema<TType, TContext>
        daoexists(): StringSchema<TType, TContext>
        reponame(): StringSchema<TType, TContext>
    }
}

export default yup
