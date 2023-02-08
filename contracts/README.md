#### GOSH Smart-contracts deployment

##### Pre-requirements
- Docker installed

#### Deploy

1. Navigate to contracts/multisig
    ```
    cd contracts/multisig
    ```
2. Build docker image with Everdev and other requirements
    ```
    make prepare-docker
    ```
3. Build GOSH giver(msig) contract for GOSH deployment
    ```
    make build-contracts-docker
    ```
4. Generate GOSH giver(msig) address, keys and network config. Note: better use endpoint address here like http://local-node, not everdev network name.
    ```
    make generate-docker NETWORK=http://local-node
    ```
5. Top up GOSH giver(msig) address. Note: you can use whatever method you want, depending on a network(se or not) and prefered tools.
Example for SE and tonos-cli.
    ```
    tonos-cli -u http://local-node call 0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415 sendTransaction '{"dest":"xxxxx","value":2000000000000000,"bounce":false}' --abi GiverV2.abi.json --sign GiverV2.keys.json
    ```
6. Deploy GOSH giver(msig).
    ```
    make deploy-docker
    ```
7. Navigate to GOSH contracts folder and build smart-contracts.
    ```
    cd contracts/gosh 
    make build-contracts-docker
    ```
8. Deploy GOSH smart-contracts.
    ```
    make deploy-docker
    ```
9. Upgrade GOSH smart-contracts.
    ```
    make upgrade-docker
    ```

 Note: you can specify extra docker args adding EXTRA_DOCKER_ARGS="--network xxxxx --xxxx xxxx"