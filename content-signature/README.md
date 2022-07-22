# Content Signature Maintenance

Provides ability to deploy content signature account onto Gosh blockchain network.

Content signature account provides proof for specific content from specific person/organisation.

## Requirements

- Node.js

## Install

```shell
npm i
tsc 
```

## Usage

### Sign Content

Signs specified content using provided keys and deploys signature contract to the network.

```shell
node cli sign [options] <secret> <content>
```

Arguments:

- `secret` Signer's secret key
- `content` Content string

Options:

- `-n, --network <address>` Network address(es) (default: "http://localhost")
- `-е, --topup-amount <value>` Topup amount (default: "1000000000")
- `-g, --giver-address <address>` Topup giver address
- `-s, --giver-secret <key>` Topup giver secret

Output:

- Address of proof account

### Check Content Signature

```shell
node cli check [options] <public> <content>
```

Verifies that specified content signed by signer with the specified public key.

Arguments:

- `public` Signer's public key
- `content` Content string

Options:

- `-n, --network <address>`  Network address(es) (default: "http://localhost")

Output:

- `true` if proof account was deployed on the network.
- `false` if proof account wasn't deployed on the network.

### Evaluate address of the Signature Account

```shell
node cli addr [options] <public> <content>
```

Calculates address of the signature account for specified content and signer's public key.

Arguments:

- `public` Signer's public key
- `content` Content string

Options:

- `-n, --network <address>` Network address(es) (default: "http://localhost")

Output:

- Address
