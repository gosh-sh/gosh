"""
Copy contracts ABIs to project.
"""

import sys
import shutil
from pathlib import Path


SRC_CONTRACTS_PATH = Path('../contracts')
DST_CONTRACTS_PATH = Path('./src/contracts')
CONTRACTS = [
    'gosh/root',
    'gosh/gosh',
    'gosh/goshdao',
    'gosh/profile',
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

    [_, version] = sys.argv

    dst_path = DST_CONTRACTS_PATH / version
    if not Path.exists(dst_path):
        Path.mkdir(dst_path)

    for contract in CONTRACTS:
        src = SRC_CONTRACTS_PATH / f'{contract}.abi.json'

        dst = contract.replace('gosh/', '').replace('smv/', '')
        dst = dst_path / f'{dst}.abi.json'

        shutil.copy(src, dst)

        print(f'============== {contract} ==============')
        print(f'ABI copied to: {dst}')


if __name__ == '__main__':
    main()
