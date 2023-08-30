docker rm -f local-node
docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 \
      -v /home/user/GOSH/gosh/tests/node_se_scripts/blockchain.conf.json:/ton-node/blockchain.conf.json \
      tonlabs/local-node:0.36.3
