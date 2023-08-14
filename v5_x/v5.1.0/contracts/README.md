#### GOSH Smart-contracts deployment

##### Pre-requirements
- [Docker installed](https://www.docker.com/get-started/)
- [tonos-cli](https://github.com/tonlabs/tonos-cli#1-installation)

#### Deploy

1. Navigate to contracts directory:
    ```
    cd contracts
    ```

2. Install a local node:
    ```
    docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 -v ../../../.ci/blockchain.conf.json:/ton-node/blockchain.conf.json tonlabs/local-node:0.36.3
    ```

3. Navigate to multisig directory:
    ```
    cd multisig
    ```

4. Create build container:
    ```
    make prepare-docker
    ```
5. Derive system wallet address:
    ```
    make generate-docker NETWORK=localhost
    ```

    As a result, the GoshGiver address will be generated,
    for example:
    ```
    ========== GoshGiver address: 0:bdf777a7ff955e189b680801f4f338631a11f851b29cc2baaf8192dd4d549f98
    ```

6. Top up system wallet.
    In `dest`, specify the GoshGiver address that you received in the previous step:

    ```
    tonos-cli -u localhost call 0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415 sendTransaction '{"dest":"0:bdf777a7ff955e189b680801f4f338631a11f851b29cc2baaf8192dd4d549f98","value":50000000000000000,"bounce":false}' --abi GiverV2.abi.json --sign GiverV2.keys.json
    ```

7. Deploy system wallet:
    ```
    make deploy-docker
    ````
8. Navigate to GOSH-contracts directory:
    ```
    cd ../gosh
    ```
9. Deploy GOSH smart-contracts:
    ```
    make deploy-docker
    ```
    