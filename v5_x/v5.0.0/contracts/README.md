#### GOSH Smart-contracts deployment

##### Pre-requirements
- Docker installed
- Giver wallet keys 

#### Deploy

1. Place giver keys file named giver.keys.json inside contracts/gosh folder
2. Navigate to gosh directory:
    ```
    cd contracts/gosh
    ```
2. Build docker image with Everdev and other requirements:
    ```
    make prepare-docker
    ```
3. Build smart-contracts:
    ```
    make build-contracts-docker
    ```
4. Deploy smart-contracts:
    ```
    make deploy-docker KEYS_PATH=/home/gosh/keys/vps23_msig_giver.keys.json NETWORK=vps23.ton.dev GIVER_WALLET_ADDR=0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391
    ```
4. Upgrade GOSH smart-contracts:
    ```
    make upgrade-docker KEYS_PATH=/home/gosh/keys/vps23_msig_giver.keys.json NETWORK=vps23.ton.dev GIVER_WALLET_ADDR=0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391 VERSIONCONTROLLER_ADDR=0:78ca698f06804b318fc40acef8e65823f67ac24fb10e8c7ad8c8553b6eac6293
    ```