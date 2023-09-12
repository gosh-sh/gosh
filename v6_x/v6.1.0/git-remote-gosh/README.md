Install guide and quick start can be found [here](https://docs.gosh.sh/working-with-gosh/git-remote-helper).

# Env parameters
User can specify this env variables to customize push process. It can be useful especially in case of network problems:

- `GOSH_CONFIG_PATH` - path to the GOSH config file;
- `GOSH_DEPLOY_RETRIES` - number of times remote tries to redeploy objects (default value is 3);
- `GOSH_PUSH_CHUNK` - push snapshots and diffs chunk size (default value is 3000);
- `GOSH_REMOTE_WAIT_TIMEOUT` - timeout in seconds, defines how much time git-remote-gosh waits for set commit operation (default value is 60);
- `GOSH_REMOTE_WALLET_PARALLELISM` - amount of simultaneous calls for each user goshwallet (default value is 100);
- `GOSH_OPENTELEMETRY` - flag, that enables opentelemetry tracing.
