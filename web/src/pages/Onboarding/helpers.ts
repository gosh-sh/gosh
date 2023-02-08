import { EGoshError, GoshAdapterFactory, TValidationResult } from 'react-gosh'

const validateOnboardingDao = async (name: string): Promise<TValidationResult> => {
    const gosh = GoshAdapterFactory.createLatest()
    const checkName = gosh.isValidDaoName(name)
    if (!checkName.valid) {
        return checkName
    }

    const checkDeployed = await gosh.getDao({ name })
    if (await checkDeployed.isDeployed()) {
        return { valid: false, reason: EGoshError.DAO_EXISTS }
    }

    return { valid: true }
}

const validateOnboardingRepo = async (
    dao: string,
    name: string,
): Promise<TValidationResult> => {
    const gosh = GoshAdapterFactory.createLatest()
    const checkName = gosh.isValidRepoName(name)
    if (!checkName.valid) {
        return checkName
    }

    const checkDeployed = await gosh.getRepository({
        path: `${dao}/${name}`,
    })
    if (await checkDeployed.isDeployed()) {
        return { valid: false, reason: 'Repository already exists' }
    }

    return { valid: true }
}

export { validateOnboardingDao, validateOnboardingRepo }
