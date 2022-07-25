"""
Copy contracts ABIs to project.
"""

import shutil
from pathlib import Path


SRC_CONTRACTS_PATH = Path('../contracts')
DST_CONTRACTS_PATH = Path('./src/contracts')
CONTRACTS = [
    'gosh/gosh',
    'gosh/goshdao',
    'gosh/daocreator',
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
]


def main():
    """Entry point main"""
    for contract in CONTRACTS:
        src_path = SRC_CONTRACTS_PATH / f'{contract}.abi.json'
        dst_path = contract.replace('gosh/', '').replace('smv/', '')
        dst_path = DST_CONTRACTS_PATH / f'{dst_path}.abi.json'
        shutil.copy(src_path, dst_path)

        print(f'============== {contract} ==============')
        print(f'ABI copied to: {dst_path}')
        print('=========================================')


if __name__ == '__main__':
    main()
