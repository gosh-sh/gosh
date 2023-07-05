Install guide and quick start can be found [here](https://docs.gosh.sh/working-with-gosh/git-remote-helper).

# Env parameters
User can specify this env variables to customize push process. It can be useful especially in case of network problems:

- `GOSH_CONFIG_PATH` - path to the GOSH config file;
- `GOSH_REMOTE_WAIT_TIMEOUT` - timeout in seconds, defines how much time git-remote-gosh waits for set commit operation;
- `GOSH_REMOTE_WALLET_PARALLELISM` - amount of simultaneous calls for each user goshwallet;
- `GOSH_OPENTELEMETRY` - flag, that enables opentelemetry tracing.
