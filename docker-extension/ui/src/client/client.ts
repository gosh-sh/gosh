import {
  Image,
  Container
} from "./../interfaces";

const logger = console;

const ENDPOINTS="https://gra01.net.everos.dev,https://rbx01.net.everos.dev,https://eri01.net.everos.dev";
const NETWORK_NAME="net.ton.dev";
const GOSH_ROOT_CONTRACT_ADDRESS="0:08ff47a77ba853306d234f5803dc25e5a9128aa280df44889f7d64c69f81aec8";
const WELL_KNOWN_ROOT_CONTRACT_ADDRESS = "gosh::"+NETWORK_NAME+"://"+GOSH_ROOT_CONTRACT_ADDRESS+"/";

const METADATA_KEY = {
  BUILD_PROVIDER: "WALLET_PUBLIC",
  GOSH_ADDRESS: "GOSH_ADDRESS", 
  GOSH_COMMIT_HASH: "GOSH_COMMIT_HASH"
};
const COMMAND = {
  CALCULATE_IMAGE_SHA: "/command/gosh-image-sha.sh",
  VALIDATE_IMAGE_SIGNATURE: "/command/ensure-image-signature.sh",
  VALIDATE_IMAGE_SHA: "/command/validate-image-sha.sh"
};
const UNSIGNED_STATUS = "error";

declare global {
  interface Window {
    ddClient: {
      docker: {
        listContainers: () => Promise<Array<any>>,
        listImages: () => Promise<Array<any>>
      },
      extension: any
    };
  }
}

export class DockerClient {

  /**
   * Get containers list
   **/
  static async getContainers(): Promise<Array<Container>> {
    const containers = await window.ddClient.docker.listContainers();
    const containersViewModel:Array<Container> = [];
    for (var i=0; i < containers.length; i++) {
      const container = containers[i];
      const containerName = container.Names.length > 0 ? container.Names[0] : container.Id;
      const [isSigned, buildProvider] = await DockerClient.getBuildProvider(container);
      const verificationStatus = isSigned ? 
        await DockerClient.getImageStatus(buildProvider, container.ImageID)
        : UNSIGNED_STATUS;
      const [hasRepositoryAddress, goshRepositoryAddress] = DockerClient.readContainerImageMetadata(container, METADATA_KEY.GOSH_ADDRESS, "-");
      containersViewModel.push({
        validated: verificationStatus,
        id: container.Id,
        containerHash: container.Id,
        containerName: containerName,
        imageHash: container.ImageID,
        buildProvider: buildProvider,
        goshRootAddress: goshRepositoryAddress 
      });
    }
    return containersViewModel;
  }

  /**
   * Get containers list
   **/
  static async getImages(): Promise<Array<Image>> {
    const images = await window.ddClient.docker.listImages();
    const imagesViewModel: Array<Image> = [];
    for (var i=0; i < images.length; i++) {
      const image = images[i];
      const [isSigned, buildProvider] = await DockerClient.getBuildProvider(image);
      const verificationStatus = isSigned ? 
        await DockerClient.getImageStatus(buildProvider, image.Id)
        : UNSIGNED_STATUS;
      const [hasRepositoryAddress, goshRepositoryAddress] = DockerClient.readContainerImageMetadata(image, METADATA_KEY.GOSH_ADDRESS, "-");
      imagesViewModel.push({
        validated: verificationStatus,
        id: image.Id,
        imageHash: image.Id,
        buildProvider: buildProvider,
        goshRootAddress: goshRepositoryAddress
      });
    }
    return imagesViewModel;
  }

  static async _findImage(imageId: string): Promise<[boolean, any]> {
    const images = await window.ddClient.docker.listImages();
    for (var i=0; i < images.length; i++) {
      const image = images[i];
      if (image.Id == imageId) {
        return [true, image];
      }
    }
    return [false, {}];
  }

  /**
   * Get image state
   **/
  static async getImageStatus(buildProviderPublicKey: string, imageId: string): Promise<any> {
    logger.log(`Calling getImageStatus: pubkey - ${buildProviderPublicKey}  id: ${imageId}...\n`);
    try {
      const [isImageHashCalculated, imageHash] = await DockerClient.calculateImageSha(imageId, "");
      if (!isImageHashCalculated) {
        return "warning";
      }
      logger.log("Ensuring image has a signature: "+imageHash);
      const result = await window.ddClient.extension.vm.cli.exec(
        COMMAND.VALIDATE_IMAGE_SIGNATURE,
        [ENDPOINTS, buildProviderPublicKey, imageHash]
      );
      logger.log(`Result: <${JSON.stringify(result)}>\n`);
      if ('code' in result && result.code != 0) {
        return "error";
      }
      const resultText = result.stdout.trim(); 
      const verificationStatus =  resultText == "true";
      return verificationStatus ? "success" : "error";
    } 
    catch (e) {
        logger.log(`image validaton failed ${JSON.stringify(e)}`); 
        return "warning";
    }
  }

  static async getBuildProvider(container: any): Promise<[boolean, string]> {
    return DockerClient.readContainerImageMetadata(container, METADATA_KEY.BUILD_PROVIDER, "-");
  }

  static async validateContainerImage(imageId: string, appendValidationLog: any, closeValidationLog:any):  Promise<boolean> {
    const [imageExists, image] = await DockerClient._findImage(imageId);
    if (!imageExists) {
      appendValidationLog("Error: image does not exist any more.");
      closeValidationLog();
      return false;
    }
    const [hasRepositoryAddress, goshRepositoryAddress] = DockerClient.readContainerImageMetadata(image, METADATA_KEY.GOSH_ADDRESS, "-");
    const [hasCommitHash, goshCommitHash] = DockerClient.readContainerImageMetadata(image, METADATA_KEY.GOSH_COMMIT_HASH, "-");
     
    if  (!hasRepositoryAddress || !hasCommitHash) {
      appendValidationLog("Error: The image was not build from Gosh");
      closeValidationLog();
      return false;
    }

    // Note: Not safe. improve
    if (!goshRepositoryAddress.startsWith(WELL_KNOWN_ROOT_CONTRACT_ADDRESS)) {
      appendValidationLog("Error: unknown gosh root address.");
      closeValidationLog();
      return false;
    }
    
    const goshRepositoryName = goshRepositoryAddress.slice(WELL_KNOWN_ROOT_CONTRACT_ADDRESS.length);

    try {
      const [isImageShaCalculated, imageSha] = await DockerClient.calculateImageSha(imageId, "");
      if (!isImageShaCalculated) {
        appendValidationLog("Failed to calculate image sha.");
        return false;
      }
      appendValidationLog("Image sha: " + imageSha);

      let result = {
        code: -1,
        stdout: ""
      };
      await window.ddClient.extension.vm.cli.exec(
        COMMAND.VALIDATE_IMAGE_SHA,
        [
          ENDPOINTS,
          NETWORK_NAME,
          GOSH_ROOT_CONTRACT_ADDRESS,
          goshRepositoryName, 
          goshCommitHash
        ],
        {
          stream: {
            onOutput(data: any): void {
              if (!!data.stdout) {
                result.stdout += data.stdout + "\n";
                appendValidationLog(data.stdout);
              }
              if (!!data.stderr) {
                appendValidationLog(data.stderr);
              }
            },
            onError(error: any): void {
              console.error(JSON.stringify(error));
              appendValidationLog(JSON.stringify(error));
              closeValidationLog();
            },
            onClose(exitCode: number): void {
              logger.log(`onClose with exit code ${exitCode}`);
              result.code = exitCode;
              if ('code' in result && result.code != 0) {
                appendValidationLog("Failed to build an image.");
                closeValidationLog();
                return;
              }
              const calculatedImageSha = result.stdout.trim();
              appendValidationLog("Calculated image sha from gosh: " + calculatedImageSha);
              if (calculatedImageSha != imageSha) {
                appendValidationLog("Failed: sha does not match.");
                closeValidationLog();
                return;
              }
              appendValidationLog("Success.");
              closeValidationLog();
            },
          }
        }
      );
      return true;
    } 
    catch(error:any) {
      console.error(error);
      return false;
    } 
  }

  static async calculateImageSha(imageId: string, defaultValue: string): Promise<[boolean, string]> {
    try {
      const result = await window.ddClient.extension.vm.cli.exec(
        COMMAND.CALCULATE_IMAGE_SHA,
        [imageId]
      );
      if ('code' in result && !!result.code) {
        logger.log(`Failed to calculate image sha. ${JSON.stringify(result)}`);
        return [false, defaultValue];
      }
      const imageHash = result.stdout.trim();
      return [true, imageHash]; 
    } catch(error: any) {
      logger.log(`Error: ${JSON.stringify(error)}`);
      return [false, defaultValue];
    }
  }

  static readContainerImageMetadata(container: any, key: string, defaultValue: string): [boolean, string] {
    const metadata = container.Labels || {};
    if (key in metadata) {
      return [true, metadata[key]];
    } else {
      return [false, defaultValue];
    }
  }
}

export default DockerClient;

