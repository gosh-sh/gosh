import { TonClient } from "@eversdk/core";
import { toast } from "react-toastify";
import cryptoJs, { SHA1 } from "crypto-js";
import { Buffer } from "buffer";
import { GoshDaoCreator, GoshSnapshot } from "../types/classes";
import { IGoshDaoCreator, TGoshBranch, TGoshTree, TGoshTreeItem } from "../types/types";


export const getEndpoints = (): string[] => {
    switch (process.env.REACT_APP_EVER_NETWORK) {
        case 'devnet':
            return ['https://net.ton.dev'];
        case 'mainnet':
            return ['https://main.ton.dev'];
        case 'se':
        default:
            return ['http://localhost'];
    }
}

export const getGoshDaoCreator = (client: TonClient): IGoshDaoCreator => {
    const address = process.env.REACT_APP_CREATOR_ADDR;
    if (!address) throw Error('No GoshDaoCreator address specified');
    return new GoshDaoCreator(client, address);
}

/**
 * Generate commit diff content
 * @param monaco Monaco object from `useMonaco` hook
 */
// export const generateDiff = async (
//     monaco: any,
//     modified: string,
//     original?: string
// ): Promise<TDiffData[]> => {
//     return new Promise((resolve, reject) => {
//         if (!monaco) reject('Can not create diff (Diff editor is not initialized)');

//         // Create hidden monaco diff editor and get diff
//         const originalModel = monaco.editor.createModel(original, 'markdown');
//         const modifiedModel = monaco.editor.createModel(modified, 'markdown');

//         const diffContainer = document.createElement('div');
//         const diffEditor = monaco.editor.createDiffEditor(diffContainer);
//         diffEditor.setModel({ original: originalModel, modified: modifiedModel });
//         diffEditor.onDidUpdateDiff(() => {
//             const content = diffEditor.getOriginalEditor().getValue().split('\n');
//             const changes = diffEditor.getLineChanges();
//             const diff: TDiffData[] = [];
//             changes.forEach((item: any) => {
//                 const {
//                     originalStartLineNumber,
//                     originalEndLineNumber,
//                     modifiedStartLineNumber,
//                     modifiedEndLineNumber
//                 } = item;

//                 const lines = [];
//                 for (let line = originalStartLineNumber - 1; line < originalEndLineNumber; line++) {
//                     lines.push(content[line]);
//                 }
//                 diff.push({ modifiedStartLineNumber, modifiedEndLineNumber, originalLines: lines });
//             });
//             resolve(diff);
//         });
//     });
// }

// export const restoreFromDiff = (modified: string, diff: TDiffData[]): string => {
//     const restored = [];
//     const source = modified.split('\n');
//     for (let mL = 0; mL < source.length; mL++) {
//         const changed = diff.find((item) => item.modifiedStartLineNumber - 1 === mL);
//         if (changed) {
//             if (changed.modifiedEndLineNumber === 0) restored.push(source[mL]);
//             restored.push(...changed.originalLines);
//             if (changed.modifiedEndLineNumber > 0) mL = changed.modifiedEndLineNumber - 1;
//         } else {
//             restored.push(source[mL]);
//         }
//     }
//     // console.log('Restored', restored);
//     return restored.join('\n');
// }

export const getCodeLanguageFromFilename = (monaco: any, filename: string): string => {
    let splitted = filename.split('.');
    const ext = `.${splitted[splitted.length - 1]}`;
    const found = monaco.languages.getLanguages().find((item: any) => {
        if (item.extensions)
            return item.extensions.indexOf(ext) >= 0
        else 
            return false;
    });
    return found?.id || 'plaintext';
}

/**
 * Convert from nanoevers to evers
 * @param value
 * @param round
 * @returns
 */
export const toEvers = (value: any, round: number = 3): number => {
    const rounder = 10 ** round;
    return Math.round(value / 10 ** 9 * rounder) / rounder;
}

/**
 * Convert from evers to nanoevers
 * @param value
 * @returns
 */
export const fromEvers = (value: number): number => {
    return value * 10 ** 9;
}

export const sha1 = (data: string, type: 'blob' | 'commit'): string => {
    let content = data;
    if (type === 'commit') content += '\n';
    const size = Buffer.from(content, 'utf-8').byteLength;
    const object = Buffer.from(`${type} ${size}\0${content}`);
    const hash = SHA1(object.toString());
    return hash.toString();
}

export const sha1Tree = (tree: TGoshTree) => {
    const result = Object.keys(tree).sort().map(path => {
        return Buffer.concat(
            tree[path]
                //@ts-ignore
                .sort((a: any, b: any) => (a.name > b.name) - (a.name < b.name))
                .map((i: any) => Buffer.concat([
                    Buffer.from(`${i.mode === '040000' ? '40000' : i.mode} ${i.name}\0`),
                    Buffer.from(i.sha, 'hex')
                ]))
        )
    });

    const buffer = result[0];
    const size = buffer.byteLength;
    let words = cryptoJs.enc.Utf8.parse(`tree ${size}\0`);
    words.concat(cryptoJs.enc.Hex.parse(buffer.toString('hex')));
    const hash = SHA1(words);
    return hash.toString();
}

export const getSnapshotTree = async (
    client: TonClient,
    branch: TGoshBranch
): Promise<TGoshTree> => {
    const snapshots = await Promise.all(
        branch.snapshot.map(async (address) => {
            const snapshot = new GoshSnapshot(client, address);
            await snapshot.load();
            if (!snapshot.meta) throw Error('[getSnapshotTree]: Can not load snapshot');
            return snapshot;
        })
    );
    console.debug('[getSnapshotTree]: Snapshots', snapshots);

    // Build grouped by path tree from snapshots
    const tree: TGoshTree = { '': [] };
    snapshots.forEach((snapshot) => {
        if (!snapshot.meta) throw Error('[getSnapshotTree]: Snapshot meta is empty');
        // Check if path has subdirs and create each of them as tree key
        const fullPath = snapshot.meta.name.replace(`${branch.name}/`, '');
        if (fullPath.indexOf('/') >= 0) {
            // Split path and iterate over dirs only (pathSplit.length - 1)
            const pathSplit = fullPath.split('/');
            for (let i = 0; i < pathSplit.length - 1; i++) {
                const parent = pathSplit.slice(0, i).join('/') || '';
                const name = pathSplit.slice(i, i + 1).join('/');
                const path = [parent, name].filter(item => item !== '').join('/');
                // If path is not found in tree, create path key and push current
                // path as a child for parent path
                if (!tree[path]) {
                    tree[path] = [];
                    tree[parent].push({ mode: '040000', type: 'tree', sha: '', path: parent, name });
                }
            }
        }

        // Add blob to corresponding path
        const [path, name] = splitByPath(fullPath);
        tree[path].push({
            mode: '100644',
            type: 'blob',
            sha: sha1(snapshot.meta.content, 'blob'),
            path,
            name
        });
    });

    // Sort root tree path by name.
    // Rest tree paths will be sorted later
    // @ts-ignore
    tree[''].sort((a, b) => (a.name > b.name) - (a.name < b.name))

    // Sort the hole tree by the longest key (this key will contain blobs only),
    // calculate each subtree sha and update subtree parent item
    calculateGoshTree(tree);
    return tree;
}

export const getCommitTree = (filesList: string[]): TGoshTree => {
    const list = filesList.map((entry: string) => {
        const [mode, type, tail] = entry.split(' ')
        const [sha, fname] = tail.split('\t')
        const lastSlash = fname.lastIndexOf('/')
        const path = lastSlash >= 0 ? fname.slice(0, lastSlash) : ''
        return {
            mode,
            type,
            sha,
            path,
            name: lastSlash >= 0 ? fname.slice(lastSlash + 1) : fname,
        }
    })
    return groupByPath(list as TGoshTreeItem[]);
}

export const calculateGoshTree = (tree: TGoshTree) => {
    // Sort the hole tree by the longest key (this key will contain blobs only),
    // calculate each subtree sha and update subtree parent item
    Object.keys(tree)
        .sort((a, b) => b.length - a.length)
        .filter((key) => key.length)
        .forEach((key) => {
            const sha = sha1Tree({ '': tree[key] });
            const [path, name] = splitByPath(key);
            const found = tree[path].find((item) => item.path === path && item.name === name);
            if (found) found.sha = sha;
        });
}

const splitByPath = (fullPath: string): [path: string, name: string] => {
    const lastSlashIndex = fullPath.lastIndexOf('/');
    const path = lastSlashIndex >= 0 ? fullPath.slice(0, lastSlashIndex) : '';
    const name = lastSlashIndex >= 0 ? fullPath.slice(lastSlashIndex + 1) : fullPath;
    return [path, name];
}

const groupByPath = (list: TGoshTreeItem[]) => {
    const isTree = (i: TGoshTreeItem) => i.type === 'tree'

    const result = list
        .filter(isTree)
        .reduce((acc: TGoshTree, i) => {
            const path = i.path !== '' ? `${i.path}/${i.name}` : i.name;
            if (!acc.path) acc[path] = [];
            return acc;
        }, { '': [] })

    list.forEach((i: any) => {
        result[i.path].push(i);
    })
    return result;
}

export const unixtimeWithTz = (): string => {
    const pad = (num: number): string => (num < 10 ? '0' : '') + num;
    const unixtime = Math.floor(Date.now() / 1000);
    const tzo = -new Date().getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    return [
        `${unixtime} ${dif}`,
        pad(Math.floor(Math.abs(tzo) / 60)),
        pad(Math.abs(tzo) % 60)
    ].join('');
}

export const getCommitTime = (str: string): Date => {
    const [unixtime] = str.split(' ').slice(-2);
    return new Date(+unixtime * 1000);
}

/**
 * Toast shortcuts
 */
export const ToastOptionsShortcuts = {
    Default: {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        pauseOnFocusLoss: false,
        draggable: true,
        closeButton: true,
        progress: undefined
    },
    Message: {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 1500,
        pauseOnFocusLoss: false,
        pauseOnHover: false,
        closeButton: false,
        hideProgressBar: true
    },
    CopyMessage: {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 1500,
        pauseOnFocusLoss: false,
        pauseOnHover: false,
        closeButton: false,
        hideProgressBar: true,
        style: { width: '50%' },
        className: 'mx-auto'
    }
}
