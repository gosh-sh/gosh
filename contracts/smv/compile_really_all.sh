bash ./compile_all.sh

everdev sol compile ./External/tip3/TokenRoot.sol
everdev sol compile ./External/tip3/TokenWallet.sol

mv ./*.tvc ../../target/
mv ./*.json ../../target/
