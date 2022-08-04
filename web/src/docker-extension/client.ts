import { Image, Container } from './interfaces'
import { dockerClient, goshClient, goshRoot } from '../helpers'
import { GoshContentSignature, GoshDao, GoshWallet } from '../types/classes'
import { TUserState } from '../types/types'

const logger = console

const ENDPOINTS = process.env.REACT_APP_GOSH_NETWORK || ''
const GOSH_NETWORK = ENDPOINTS.replace(/^https?:\/\//, '')
const GOSH_ROOT_CONTRACT_ADDRESS = process.env.REACT_APP_GOSH_ADDR || ''

console.debug('Endpoints', ENDPOINTS)
console.debug('Gosh root', GOSH_ROOT_CONTRACT_ADDRESS)
const METADATA_KEY = {
    GOSH_ADDRESS: 'GOSH_ADDRESS', // e.g. gosh://0:6dfcf8a001da3e7a1910f873245c47904638e8fb4bf204c0b31b156f9c891d8c/test/repo
    GOSH_COMMIT_HASH: 'GOSH_COMMIT_HASH',
}
const COMMAND = {
    CALCULATE_IMAGE_SHA: '/command/gosh-image-sha.sh',
    VALIDATE_IMAGE_SIGNATURE: '/command/ensure-image-signature.sh',
    VALIDATE_IMAGE_SHA: '/command/validate-image-sha.sh',
}
const UNSIGNED_STATUS = 'error'

interface IDockerImage {
    Id: string
}
interface IDockerContainer {
    Id: string
    ImageID: string
    Names?: Array<string>
}

export class DockerClient {
    /**
     * Get containers list
     **/
    static async getContainers(userState: TUserState): Promise<Container[]> {
        const containers =
            (await dockerClient?.docker.listContainers()) as IDockerContainer[]
        return await Promise.all(
            containers.map(async (container) => {
                const image = await DockerClient._findImage(container!.ImageID)
                if (!image) {
                    throw new Error(`Can't find image for ${container}`)
                }

                const containerName = !!container.Names?.length
                    ? container.Names[0]
                    : container.Id
                const [hasGoshAddress, goshAddress] = DockerClient.readImageMetadata(
                    image,
                    METADATA_KEY.GOSH_ADDRESS,
                    '-',
                )
                const [hasGoshCommitHash, goshCommitHash] =
                    DockerClient.readImageMetadata(
                        image,
                        METADATA_KEY.GOSH_COMMIT_HASH,
                        '-',
                    )

                const validated =
                    hasGoshAddress && hasGoshCommitHash
                        ? await DockerClient.getImageStatus(
                              image,
                              userState,
                              goshAddress,
                              goshCommitHash,
                          )
                        : UNSIGNED_STATUS
                return {
                    id: container.Id,
                    containerHash: container.Id,
                    imageHash: image.Id,
                    validated,
                    goshAddress,
                    goshCommitHash,
                    containerName,
                }
            }),
        )
    }

    /**
     * Get containers list
     **/
    static async getImages(userState: TUserState): Promise<Image[]> {
        const images = (await dockerClient?.docker.listImages()) as IDockerImage[]
        return await Promise.all(
            images.map(async (image) => {
                const [hasGoshAddress, goshAddress] = DockerClient.readImageMetadata(
                    image,
                    METADATA_KEY.GOSH_ADDRESS,
                    '-',
                )
                const [hasGoshCommitHash, goshCommitHash] =
                    DockerClient.readImageMetadata(
                        image,
                        METADATA_KEY.GOSH_COMMIT_HASH,
                        '-',
                    )

                const validated =
                    hasGoshAddress && hasGoshCommitHash
                        ? await DockerClient.getImageStatus(
                              image,
                              userState,
                              goshAddress,
                              goshCommitHash,
                          )
                        : UNSIGNED_STATUS
                return {
                    id: image.Id,
                    imageHash: image.Id,
                    validated,
                    goshAddress,
                    goshCommitHash,
                }
            }),
        )
    }

    static async _findImage(imageId: string): Promise<IDockerImage | undefined> {
        const images = (await dockerClient?.docker.listImages()) as Array<IDockerImage>
        return images.find((image) => image.Id === imageId)
    }

    static async _getWallet(
        userState: TUserState,
        goshRootContract: string,
        goshDao: string,
    ): Promise<GoshWallet | undefined> {
        if (goshRootContract !== GOSH_ROOT_CONTRACT_ADDRESS) {
            return
        }

        const daoAddress = await goshRoot.getDaoAddr(goshDao)
        const dao = new GoshDao(goshClient, daoAddress)
        const walletAddr = await dao.getWalletAddr(`0x${userState.keys?.public}`, 0)

        const wallet = new GoshWallet(goshClient, walletAddr, userState?.keys)
        return wallet
    }

    static _getRepositoryTuple(fullRepositoryName: string): [string, string, string] {
        // TODO: handle errors
        const [goshRootContract, goshDao, goshRepositoryName] = fullRepositoryName
            .slice('gosh://'.length)
            .split('/')

        return [goshRootContract, goshDao, goshRepositoryName]
    }

    /**
     * Get image state
     **/
    static async getImageStatus(
        image: IDockerImage,
        userState: TUserState,
        goshAddress: string,
        goshCommitHash: string,
    ): Promise<any> {
        logger.log(
            `Calling getImageStatus: userState - ${userState}  id: ${image.Id}...\n`,
        )
        try {
            if (!dockerClient?.extension.vm) throw new Error('Extension vm undefined')

            const [isImageHashCalculated, imageHash] =
                await DockerClient.calculateImageSha(image.Id, '')
            console.log('calculatedImageSha', isImageHashCalculated, imageHash)
            if (!isImageHashCalculated) {
                return 'warning'
            }

            logger.log('Ensuring image has a signature: ' + imageHash)
            const [goshRoot, goshDao, goshRepoName] =
                DockerClient._getRepositoryTuple(goshAddress)
            const goshRepositoryName = `${goshDao}/${goshRepoName}`

            const wallet = await DockerClient._getWallet(userState, goshRoot, goshDao)
            if (!wallet) {
                return 'warning'
            }

            const contentAddr = await wallet.getContentAdress(
                goshRepositoryName,
                goshCommitHash,
                '',
            )
            const contentObj = new GoshContentSignature(goshClient, contentAddr)
            const content = await contentObj.getContent()
            const validImageHashes = content.split(',')

            return validImageHashes.includes(imageHash) ? 'success' : 'error'
        } catch (e) {
            logger.log(`image validaton failed ${JSON.stringify(e)}`)
            return 'warning'
        }
    }

    static async getBuildProvider(container: any): Promise<[boolean, string]> {
        return DockerClient.readImageMetadata(container, METADATA_KEY.GOSH_ADDRESS, '-')
    }

    static async validateContainerImage(
        imageId: string,
        appendValidationLog: any,
        closeValidationLog: any,
        userState: TUserState,
    ): Promise<boolean> {
        const image: IDockerImage | undefined = await DockerClient._findImage(imageId)
        if (typeof image === 'undefined') {
            appendValidationLog('Error: image does not exist any more.')
            closeValidationLog()
            return false
        }
        const [hasRepositoryAddress, goshAddress] = DockerClient.readImageMetadata(
            image,
            METADATA_KEY.GOSH_ADDRESS,
            '-',
        )
        const [hasCommitHash, goshCommitHash] = DockerClient.readImageMetadata(
            image,
            METADATA_KEY.GOSH_COMMIT_HASH,
            '-',
        )

        if (!hasRepositoryAddress || !hasCommitHash) {
            appendValidationLog('Error: The image was not build from Gosh')
            closeValidationLog()
            return false
        }

        appendValidationLog(`Repository ${goshAddress}\n on commit ${goshCommitHash}`)

        if (!goshAddress.startsWith('gosh://')) {
            appendValidationLog('Error: Invalid gosh address protocol')
            closeValidationLog()
            return false
        }

        const [goshRootContract, goshDao, goshRepoName] =
            DockerClient._getRepositoryTuple(goshAddress)
        // Note: Not safe. improve
        // TODO: check root contract
        if (goshRootContract !== GOSH_ROOT_CONTRACT_ADDRESS) {
            appendValidationLog('Error: unknown gosh root address.')
            closeValidationLog()
            return false
        }

        const goshRepositoryName = `${goshDao}/${goshRepoName}`

        const wallet = await DockerClient._getWallet(userState, goshRootContract, goshDao)
        if (!wallet) {
            appendValidationLog('Error: unable to get gosh wallet.')
            closeValidationLog()
            return false
        }

        try {
            if (!dockerClient?.extension.vm) throw new Error('Extension vm undefined')
            appendValidationLog('Build image from Gosh')

            const goshAddressWithNetwork = goshAddress.replace(
                /^gosh:\/\//,
                `gosh::${GOSH_NETWORK}://`,
            )

            const result = await dockerClient.extension.vm.cli.exec(
                COMMAND.VALIDATE_IMAGE_SHA,
                [goshAddressWithNetwork, `${goshDao}__${goshRepoName}`, goshCommitHash],
            )

            if ('code' in result && !!result.code) {
                logger.log(`Failed to validate image. ${JSON.stringify(result)}`)
                closeValidationLog()
                return false
            }

            console.log('Stderr:', result.stderr)

            const imageSha = result.stdout.trim()

            if (imageSha.length === 0) {
                appendValidationLog('Error: Gosh sha is empty')
                closeValidationLog()
                return false
            }

            appendValidationLog(`Gosh image SHA: ${imageSha}`)

            // HACK!!!
            // await wallet.deployContent(goshRepositoryName, goshCommitHash, '', imageSha)

            const contentAddr = await wallet.getContentAdress(
                goshRepositoryName,
                goshCommitHash,
                '',
            )

            const contentObj = new GoshContentSignature(goshClient, contentAddr)
            const content = await contentObj.getContent()
            const validImageHashes = content.split(',')

            console.log('List of signed bashes:', validImageHashes)

            if (validImageHashes.includes(imageSha)) {
                appendValidationLog('Success.')
                closeValidationLog()
                return true
            } else {
                appendValidationLog('Failed: sha does not match.')
                closeValidationLog()
                return false
            }
        } catch (error: any) {
            console.error(error)
            return false
        }
    }

    static async calculateImageSha(
        imageId: string,
        defaultValue: string,
    ): Promise<[boolean, string]> {
        logger.log(`calculateImageSha ${imageId}`)
        try {
            if (!dockerClient?.extension.vm) {
                throw new Error('Extension vm undefined')
            }
            const result = await dockerClient.extension.vm.cli.exec(
                COMMAND.CALCULATE_IMAGE_SHA,
                [imageId],
            )
            if ('code' in result && !!result.code) {
                logger.log(`Failed to calculate image sha. ${JSON.stringify(result)}`)
                return [false, defaultValue]
            }
            const imageHash = result.stdout.trim()
            return [true, imageHash]
        } catch (error: any) {
            logger.log(`Error: ${JSON.stringify(error)}`)
            return [false, defaultValue]
        }
    }

    static readImageMetadata(
        container: any,
        key: string,
        defaultValue: string,
    ): [boolean, string] {
        const metadata = container.Labels || {}
        if (key in metadata) {
            return [true, metadata[key]]
        } else {
            return [false, defaultValue]
        }
    }
}

export default DockerClient
