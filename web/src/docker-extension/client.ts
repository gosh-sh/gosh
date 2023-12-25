import { Image, Container } from './interfaces'
import { AppConfig, GoshAdapterFactory, TAddress } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'

const logger = console

const IMAGE_LABELS = {
  GOSH_ADDRESS: 'gosh.address',
  GOSH_COMMIT: 'gosh.commit',
  GOSH_IMAGE_DOCKERFILE: 'gosh.image.dockerfile',
}

const COMMAND = {
  SET_GITREMOTE_CONFIG: '/command/set-gitremote-config.sh',
  CALCULATE_IMAGE_SHA: '/command/gosh-image-sha.sh',
  VALIDATE_IMAGE_SIGNATURE: '/command/ensure-image-signature.sh',
  VALIDATE_IMAGE_SHA: '/command/validate-image-sha.sh',
  BUILD_IMAGE: '/command/build-image.sh',
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
  static async getContainers(): Promise<Container[]> {
    const containers =
      (await AppConfig.dockerclient?.docker.listContainers()) as IDockerContainer[]
    return await Promise.all(
      containers.map(async (container) => {
        const image = await DockerClient._findImage(container!.ImageID)
        if (!image) {
          throw new Error(`Can't find image for ${container}`)
        }

        const containerName = !!container.Names?.length
          ? container.Names[0]
          : container.Id
        const [hasGosh, remoteUrl] = DockerClient.readImageMetadata(
          image,
          IMAGE_LABELS.GOSH_ADDRESS,
          '-',
        )
        const [hasCommit, commit] = DockerClient.readImageMetadata(
          image,
          IMAGE_LABELS.GOSH_COMMIT,
          '-',
        )

        const validated =
          hasGosh && hasCommit
            ? await DockerClient.getImageStatus(image, remoteUrl, commit)
            : UNSIGNED_STATUS
        return {
          id: container.Id,
          containerHash: container.Id,
          imageHash: image.Id,
          validated,
          remoteUrl,
          commit,
          containerName,
        }
      }),
    )
  }

  /**
   * Get containers list
   **/
  static async getImages(): Promise<Image[]> {
    const images = (await AppConfig.dockerclient?.docker.listImages()) as IDockerImage[]
    return await Promise.all(
      images.map(async (image) => {
        const [hasGosh, remoteUrl] = DockerClient.readImageMetadata(
          image,
          IMAGE_LABELS.GOSH_ADDRESS,
          '-',
        )
        const [hasCommit, commit] = DockerClient.readImageMetadata(
          image,
          IMAGE_LABELS.GOSH_COMMIT,
          '-',
        )

        const validated =
          hasGosh && hasCommit
            ? await DockerClient.getImageStatus(image, remoteUrl, commit)
            : UNSIGNED_STATUS
        return {
          id: image.Id,
          imageHash: image.Id,
          validated,
          remoteUrl,
          commit,
        }
      }),
    )
  }

  static async _findImage(imageId: string): Promise<IDockerImage | undefined> {
    const images =
      (await AppConfig.dockerclient?.docker.listImages()) as Array<IDockerImage>
    return images.find((image) => image.Id === imageId)
  }

  static async _getRepository(
    gosh: TAddress,
    dao: string,
    repo: string,
    options?: { setRemoteConfig?: boolean },
  ): Promise<IGoshRepositoryAdapter | undefined> {
    const { setRemoteConfig = true } = options ?? {}

    // Check if provided gosh version is supported
    const index = Object.values(AppConfig.versions).findIndex((addr) => addr === gosh)
    if (index < 0) return undefined

    // Get repository adapter
    const version = Object.keys(AppConfig.versions)[index]
    const goshAdapter = GoshAdapterFactory.create(version)

    const daoAdapter = await goshAdapter.getDao({ name: dao })
    if (!(await daoAdapter.isDeployed())) return undefined

    const repoAdapter = await daoAdapter.getRepository({ name: repo })
    if (!(await repoAdapter.isDeployed())) return undefined

    // Set git remote config
    if (setRemoteConfig) {
      const config = await daoAdapter.getRemoteConfig()
      const setConfigCmd = await AppConfig.dockerclient.extension.vm.cli.exec(
        COMMAND.SET_GITREMOTE_CONFIG,
        [JSON.stringify(JSON.stringify(config))],
      )
      console.log('setConfigCmd', setConfigCmd)
    }

    return repoAdapter
  }

  static _getRepositoryTuple(fullRepositoryName: string): [string, string, string] {
    // TODO: handle errors
    const [gosh, dao, repo] = fullRepositoryName.slice('gosh://'.length).split('/')
    return [gosh, dao, repo]
  }

  /**
   * Get image state
   **/
  static async getImageStatus(
    image: IDockerImage,
    remoteUrl: string,
    commit: string,
  ): Promise<any> {
    logger.log(`Calling getImageStatus: id: ${image.Id}...\n`)
    try {
      if (!AppConfig.dockerclient?.extension.vm) {
        throw new Error('Extension vm undefined')
      }

      const [isImageHashCalculated, imageHash] = await DockerClient.calculateImageSha(
        image.Id,
        '',
      )
      console.log('calculatedImageSha', isImageHashCalculated, imageHash)
      if (!isImageHashCalculated) {
        return 'warning'
      }

      logger.log('Ensuring image has a signature: ' + imageHash)
      const [gosh, dao, repo] = DockerClient._getRepositoryTuple(remoteUrl)
      const repositoryPath = `${dao}/${repo}`

      const adapter = await DockerClient._getRepository(gosh, dao, repo, {
        setRemoteConfig: false,
      })
      if (!adapter) return 'warning'

      const content = await adapter.getContentSignature(repositoryPath, commit, '')
      const validImageHashes = content.split(',')

      return validImageHashes.includes(imageHash) ? 'success' : 'error'
    } catch (e) {
      logger.log(`image validaton failed ${JSON.stringify(e)}`)
      return 'warning'
    }
  }

  static async getBuildProvider(container: any): Promise<[boolean, string]> {
    return DockerClient.readImageMetadata(container, IMAGE_LABELS.GOSH_ADDRESS, '-')
  }

  static async validateContainerImage(
    imageId: string,
    appendValidationLog: any,
    closeValidationLog: any,
  ): Promise<boolean> {
    const image: IDockerImage | undefined = await DockerClient._findImage(imageId)
    if (typeof image === 'undefined') {
      appendValidationLog('Error: image does not exist any more.')
      closeValidationLog()
      return false
    }
    const [hasRepository, remoteUrl] = DockerClient.readImageMetadata(
      image,
      IMAGE_LABELS.GOSH_ADDRESS,
      '-',
    )
    const [hasCommit, commit] = DockerClient.readImageMetadata(
      image,
      IMAGE_LABELS.GOSH_COMMIT,
      '-',
    )

    if (!hasRepository || !hasCommit) {
      appendValidationLog('Error: The image was not build from Gosh')
      closeValidationLog()
      return false
    }

    appendValidationLog(`Repository ${remoteUrl}\n on commit ${commit}`)

    if (!remoteUrl.startsWith('gosh://')) {
      appendValidationLog('Error: Invalid gosh address protocol')
      closeValidationLog()
      return false
    }

    const [gosh, dao, repo] = DockerClient._getRepositoryTuple(remoteUrl)
    const repositoryPath = `${dao}/${repo}`

    const adapter = await DockerClient._getRepository(gosh, dao, repo)
    if (!adapter) {
      appendValidationLog('Error: unable to get repository.')
      closeValidationLog()
      return false
    }

    try {
      if (!AppConfig.dockerclient?.extension.vm) throw new Error('Extension vm undefined')
      appendValidationLog('Build image from Gosh')

      const result = await AppConfig.dockerclient.extension.vm.cli.exec(
        COMMAND.VALIDATE_IMAGE_SHA,
        [remoteUrl, `${dao}__${repo}`, commit],
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

      const content = await adapter.getContentSignature(repositoryPath, commit, '')
      console.log('Content', content)
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
      if (!AppConfig.dockerclient?.extension.vm) {
        throw new Error('Extension vm undefined')
      }
      const result = await AppConfig.dockerclient.extension.vm.cli.exec(
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

  static async buildImage(
    remoteUrl: string,
    commit: string,
    imageDockerfile: string,
    imageTag: string,
    appendLog: any,
  ): Promise<boolean> {
    console.log('buildImage', remoteUrl, commit, imageDockerfile)
    const [gosh, dao, repo] = DockerClient._getRepositoryTuple(remoteUrl)
    const repositoryPath = `${dao}/${repo}`

    const adapter = await DockerClient._getRepository(gosh, dao, repo)
    if (!adapter) {
      appendLog('Error: unable to get repository.')
      return false
    }
    try {
      if (!AppConfig.dockerclient?.extension.vm) {
        throw new Error('Extension vm undefined')
      }
      appendLog('Building...')
      const result = await AppConfig.dockerclient.extension.vm.cli.exec(
        COMMAND.BUILD_IMAGE,
        [
          remoteUrl,
          `${dao}__${repo}`,
          commit,
          imageDockerfile,
          imageTag,
          IMAGE_LABELS.GOSH_ADDRESS,
          IMAGE_LABELS.GOSH_COMMIT,
          IMAGE_LABELS.GOSH_IMAGE_DOCKERFILE,
        ],
      )

      if ('code' in result && !!result.code) {
        logger.log(`Failed to build an image. ${JSON.stringify(result)}`)
        return false
      }
      console.log('Stderr:', result.stderr)

      const imageSha = result.stdout.trim()
      if (imageSha.length === 0) {
        appendLog('Error: Gosh sha is empty')
        return false
      } else {
        appendLog(`Image SHA is ${imageSha}`)
      }

      appendLog('Signing...')
      await adapter.deployContentSignature(repositoryPath, commit, '', imageSha)
      appendLog('Done.')
      return true
    } catch (error: any) {
      console.error(error)
      return false
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
