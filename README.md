# GOSH

[GOSH Documentation](https://docs.gosh.sh/)

Smart-contracts deployment instructions - [contracts/README.md](https://github.com/gosh-sh/gosh/blob/dev/v5_x/v5.1.0/contracts/README.md)

## Installation

```
wget -O - https://raw.githubusercontent.com/gosh-sh/gosh/dev/install.sh | bash -s
export PATH=$PATH:$HOME/.gosh
```

By default, script installs latest release to the default path `$HOME/.gosh/`, but you can customize it with env variables:

```bash
TAG=3.0.18 BINARY_PATH=/usr/local/bin ./install.sh
```
