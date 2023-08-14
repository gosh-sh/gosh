#### GOSH Smart-contracts deployment

##### Pre-requirements
- Docker installed
- Giver wallet keys 

#### Deploy

1. Navigate to contracts directory:
    ```
    cd contracts
    ```
2. Install a local node:
    ```
    docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 -v gosh-blockchain.conf.json:/ton-node/gosh-blockchain.conf.json tonlabs/local-node:0.36.3
    ```
3. Navigate to multisig directory:
    ```
    cd multisig
    ```
4. Create build container:
    ```
    make prepare-docker
    ```
5. Build system wallet smart-contract:
    ```
    make build-contracts-docker
    ```
6. Derive system wallet address:
    ```
    make generate-docker NETWORK=localhost
    ```
7. Top up system wallet:
    ```
    everdev contract topup -n se -v 50000000000000000 -a MSIG_ADDR
    ```
8. Deploy system wallet:
    ```
    make deploy-docker
    ````
9. Navigate to GOSH-contracts directory:
    ```
    cd ../gosh
    ```
10. Deploy GOSH smart-contracts:
    ```
    make deploy-docker
    ```
    