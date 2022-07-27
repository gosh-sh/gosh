import { Image, Container } from './interfaces'
import { dockerClient, goshClient, goshRoot } from '../helpers'
import { GoshContentSignature, GoshDao, GoshWallet } from '../types/classes'
import { parse } from 'node:path/win32'
import { TUserState } from '../types/types'

const logger = console

const ENDPOINTS = process.env.REACT_APP_GOSH_NETWORK || ''
const NETWORK_NAME = process.env.REACT_APP_GOSH_NETWORK || ''
const GOSH_ROOT_CONTRACT_ADDRESS = process.env.REACT_APP_GOSH_ADDR || ''
const WELL_KNOWN_ROOT_CONTRACT_ADDRESS =
    'gosh::' + NETWORK_NAME + '://' + GOSH_ROOT_CONTRACT_ADDRESS + '/'

console.debug('Endpoints', ENDPOINTS)
console.debug('Gosh root', GOSH_ROOT_CONTRACT_ADDRESS)
const METADATA_KEY = {
    BUILD_PROVIDER: 'WALLET_PUBLIC',
    GOSH_ADDRESS: 'GOSH_ADDRESS', // gosh://0:6dfcf8a001da3e7a1910f873245c47904638e8fb4bf204c0b31b156f9c891d8c/test/repo
    GOSH_COMMIT_HASH: 'GOSH_COMMIT_HASH',
}
const COMMAND = {
    CALCULATE_IMAGE_SHA: '/command/gosh-image-sha.sh',
    VALIDATE_IMAGE_SIGNATURE: '/command/ensure-image-signature.sh',
    VALIDATE_IMAGE_SHA: '/command/validate-image-sha.sh',
}
const UNSIGNED_STATUS = 'error'

// declare global {
//     interface Window {
//         ddClient: {
//             docker: {
//                 listContainers: () => Promise<Array<any>>;
//                 listImages: () => Promise<Array<any>>;
//             };
//             extension: any;
//             host: {
//                 openExternal: (url: string) => void;
//                 [key: string]: any;
//             };
//         };
//     }
// }

export class DockerClient {
    /**
     * Get containers list
     **/
    static async getContainers(): Promise<Array<Container>> {
        const containers: any = await dockerClient?.docker.listContainers()
        const containersViewModel: Array<Container> = []
        for (var i = 0; i < containers.length; i++) {
            const container = containers[i]
            const containerName =
                container.Names.length > 0 ? container.Names[0] : container.Id
            const [isSigned, buildProvider] = await DockerClient.getBuildProvider(
                container,
            )
            const verificationStatus = isSigned
                ? await DockerClient.getImageStatus(buildProvider, container.ImageID)
                : UNSIGNED_STATUS
            const [, goshRepositoryAddress] = DockerClient.readContainerImageMetadata(
                container,
                METADATA_KEY.GOSH_ADDRESS,
                '-',
            )
            containersViewModel.push({
                validated: verificationStatus,
                id: container.Id,
                containerHash: container.Id,
                containerName: containerName,
                imageHash: container.ImageID,
                buildProvider: buildProvider,
                goshRootAddress: goshRepositoryAddress,
            })
        }
        return containersViewModel
    }

    /**
     * Get containers list
     **/
    static async getImages(): Promise<Array<Image>> {
        const images: any = await dockerClient?.docker.listImages()
        const imagesViewModel: Array<Image> = []
        for (var i = 0; i < images.length; i++) {
            const image = images[i]
            const [isSigned, buildProvider] = await DockerClient.getBuildProvider(image)
            const verificationStatus = isSigned
                ? await DockerClient.getImageStatus(buildProvider, image.Id)
                : UNSIGNED_STATUS
            const [, goshRepositoryAddress] = DockerClient.readContainerImageMetadata(
                image,
                METADATA_KEY.GOSH_ADDRESS,
                '-',
            )
            imagesViewModel.push({
                validated: verificationStatus,
                id: image.Id,
                imageHash: image.Id,
                buildProvider: buildProvider,
                goshRootAddress: goshRepositoryAddress,
            })
        }
        return imagesViewModel
    }

    static async _findImage(imageId: string): Promise<[boolean, any]> {
        const images: any = await dockerClient?.docker.listImages()
        for (var i = 0; i < images.length; i++) {
            const image = images[i]
            if (image.Id === imageId) {
                return [true, image]
            }
        }
        return [false, {}]
    }

    /**
     * Get image state
     **/
    static async getImageStatus(
        buildProviderPublicKey: string,
        imageId: string,
    ): Promise<any> {
        logger.log(
            `Calling getImageStatus: pubkey - ${buildProviderPublicKey}  id: ${imageId}...\n`,
        )
        try {
            if (!dockerClient?.extension.vm) throw new Error('Extension vm undefined')

            const [isImageHashCalculated, imageHash] =
                await DockerClient.calculateImageSha(imageId, '')
            if (!isImageHashCalculated) {
                return 'warning'
            }
            logger.log('Ensuring image has a signature: ' + imageHash)
            const result = await dockerClient.extension.vm.cli.exec(
                COMMAND.VALIDATE_IMAGE_SIGNATURE,
                [ENDPOINTS, buildProviderPublicKey, imageHash],
            )
            logger.log(`Result: <${JSON.stringify(result)}>\n`)
            if ('code' in result && result.code !== 0) {
                return 'error'
            }
            const resultText = result.stdout.trim()
            const verificationStatus = resultText === 'true'
            return verificationStatus ? 'success' : 'error'
        } catch (e) {
            logger.log(`image validaton failed ${JSON.stringify(e)}`)
            return 'warning'
        }
    }

    static async getBuildProvider(container: any): Promise<[boolean, string]> {
        return DockerClient.readContainerImageMetadata(
            container,
            METADATA_KEY.BUILD_PROVIDER,
            '-',
        )
    }

    static async validateContainerImage(
        imageId: string,
        appendValidationLog: any,
        closeValidationLog: any,
        userStatePublicKey: string,
        userState?: TUserState,
    ): Promise<boolean> {
        const [imageExists, image] = await DockerClient._findImage(imageId)
        if (!imageExists) {
            appendValidationLog('Error: image does not exist any more.')
            closeValidationLog()
            return false
        }
        const [hasRepositoryAddress, goshRepositoryAddress] =
            DockerClient.readContainerImageMetadata(image, METADATA_KEY.GOSH_ADDRESS, '-')
        const [hasCommitHash, goshCommitHash] = DockerClient.readContainerImageMetadata(
            image,
            METADATA_KEY.GOSH_COMMIT_HASH,
            '-',
        )

        if (!hasRepositoryAddress || !hasCommitHash) {
            appendValidationLog('Error: The image was not build from Gosh')
            closeValidationLog()
            return false
        }

        if (!goshRepositoryAddress.startsWith('gosh://')) {
            appendValidationLog('Error: Invalid gosh address protocol')
            closeValidationLog()
            return false
        }

        const [goshRootContract, goshDao, goshRepoName] = goshRepositoryAddress
            .slice('gosh://'.length)
            .split('/')

        // Note: Not safe. improve
        // TODO: check root contract
        if (goshRootContract !== GOSH_ROOT_CONTRACT_ADDRESS) {
            appendValidationLog('Error: unknown gosh root address.')
            closeValidationLog()
            return false
        }

        const goshRepositoryName = `${goshDao}/${goshRepoName}`

        const daoAddress = await goshRoot.getDaoAddr(goshDao)
        const dao = new GoshDao(goshClient, daoAddress)
        const walletAddr = await dao.getWalletAddr(`0x${userStatePublicKey}`, 0)

        console.log('walletAddr', walletAddr)
        console.log('daoAddress', daoAddress)

        console.log(
            'deployContent',
            goshRepositoryName,
            goshCommitHash,
            '',
            'sha256:511bd981cb73818ab72940df0af72253b2cf8fc06fbcf92be7d0b922390d3fbf',
        )

        console.log('keys', userState?.keys)

        // TODO: use only public key
        // const wallet = new GoshWallet(goshClient, walletAddr, user)
        const wallet = new GoshWallet(goshClient, walletAddr, userState?.keys)
        // await wallet.deployContent(
        //     goshRepositoryName,
        //     goshCommitHash,
        //     '',
        // )
        const contentAddr = await wallet.getContentAdress(
            goshRepositoryName,
            goshCommitHash,
            '',
        )
        const contentObj = new GoshContentSignature(goshClient, contentAddr)
        const content = await contentObj.getContent()

        console.log('content', content)
        appendValidationLog(`Valid Image Hashes: ${content}`)
        const validImageHashes = content.split(',')

        try {
            if (!dockerClient?.extension.vm) throw new Error('Extension vm undefined')

            appendValidationLog('Calculating image sha...')
            const [isImageShaCalculated, imageSha] = await DockerClient.calculateImageSha(
                imageId,
                '',
            )
            if (!isImageShaCalculated) {
                appendValidationLog('Failed to calculate image sha.')
                return false
            }

            appendValidationLog('Image sha: ' + imageSha)

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

    static readContainerImageMetadata(
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
