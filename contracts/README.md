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
    make deploy-docker -e NETWORK=vps23.ton.dev GIVER_WALLET_ADDR=0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391
    ```