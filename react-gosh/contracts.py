"""
Copy contracts ABIs to project.
"""
import json
from pathlib import Path


DST_CONTRACTS_PATH = Path('./src/resources/contracts/abi.json')
CONTRACTS = {
    '': [
        'versioncontroller',
        'profile',
        'profileindex',
        'profiledao',
    ],
    '1.0.0': [
        'gosh/systemcontract',
        'gosh/goshdao',
        'gosh/goshwallet',
        'gosh/repository',
        'gosh/commit',
        'gosh/snapshot',
        'gosh/tag',
        'gosh/diff',
        'gosh/tree',
        'gosh/content-signature',
        'smv/SMVProposal',
        'smv/SMVTokenLocker',
        'smv/SMVClient',
        'smv/TokenRoot'
    ],
    '2.0.0': [
        'gosh/systemcontract',
        'gosh/goshdao',
        'gosh/goshwallet',
        'gosh/repository',
        'gosh/commit',
        'gosh/snapshot',
        'gosh/tag',
        'gosh/task',
        'gosh/diff',
        'gosh/tree',
        'gosh/content-signature',
        'gosh/daotag',
        'gosh/taggosh',
        'gosh/topic',
        'smv/SMVProposal',
        'smv/SMVTokenLocker',
        'smv/SMVClient',
        'smv/TokenRoot'
    ],
    '3.0.0': [
        'gosh/systemcontract',
        'gosh/goshdao',
        'gosh/goshwallet',
        'gosh/repository',
        'gosh/commit',
        'gosh/snapshot',
        'gosh/tag',
        'gosh/task',
        'gosh/diff',
        'gosh/tree',
        'gosh/content-signature',
        'gosh/daotag',
        'gosh/taggosh',
        'gosh/topic',
        'smv/SMVProposal',
        'smv/SMVTokenLocker',
        'smv/SMVClient',
        'smv/TokenRoot'
    ]
}


def main():
    """Entry point main"""
    abis = {}

    for version, contracts in CONTRACTS.items():
        if version and not abis.get(version):
            abis[version] = {}

        if version == '1.0.0':
            SRC_CONTRACTS_PATH = 'v1_x'
        elif version == '2.0.0':
            SRC_CONTRACTS_PATH = 'v2_x'
        elif version == '3.0.0':
            SRC_CONTRACTS_PATH = 'v3_x'
        else:
            SRC_CONTRACTS_PATH = 'v3_x'

        SRC_CONTRACTS_PATH = Path('../') / SRC_CONTRACTS_PATH / 'contracts'
        for contract in contracts:
            src = SRC_CONTRACTS_PATH / f'{contract}.abi.json'
            key = contract.replace('gosh/', '').replace('smv/', '').lower()

            if key in CONTRACTS['']:
                abis[key] = json.load(open(src, encoding='utf8'))
            else:
                abis[version][key] = json.load(open(src, encoding='utf8'))

    json.dump(abis, open(DST_CONTRACTS_PATH, 'w', encoding='utf8'))


if __name__ == '__main__':
    main()
