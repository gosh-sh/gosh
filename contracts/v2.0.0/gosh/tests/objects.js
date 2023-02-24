module.exports = {
    commit1: {
        //0 - commit1
        sha: 'd288f0c74b4ec9d7927df1f32a667566592cd339',
        parents: [],
        content: 'tree 88ccc6b27fbf7beb37e2b2dadceef08ed83a5716\nauthor Andrey Kurochkin <andrew@Andreys-MacBook-Air.local> 1650832257 +0200\ncommitter Andrey Kurochkin <andrew@Andreys-MacBook-Air.local> 1650832257 +0200\n\nsample.txt added',
    },
    tree1_1: {
        //1- blob
        commit: 'd288f0c74b4ec9d7927df1f32a667566592cd339',
        blobName: '88ccc6b27fbf7beb37e2b2dadceef08ed83a5716',
        fullBlob: '100644 blob 3b18e512dba79e4c8300dd08aeb37f8e728b8dad    sample.txt',
        ipfsBlob: '',
        prevSha: '',
        flags: 0
    },
    blob1_1: {
        //2- blob
        commit: 'd288f0c74b4ec9d7927df1f32a667566592cd339',
        blobName: '3b18e512dba79e4c8300dd08aeb37f8e728b8dad',
        fullBlob: 'hello world',
        ipfsBlob: '',
        prevSha: '',
        flags: 0
    },
    commit2: {
        //3 - commit2
        sha: '427c1517792af35842aeea569dfa54771c12e5a2',
        parents: [],
        content: 'tree 07de9f0823e8befab652dd41657804cb2f3c3c62\nparent d288f0c74b4ec9d7927df1f32a667566592cd339\nauthor Andrey Kurochkin <andrew@Andreys-MacBook-Air.local> 1650832816 +0200\ncommitter Andrey Kurochkin <andrew@Andreys-MacBook-Air.local> 1650832816 +0200\n\ngoshfile added',
    },
    tree2_1: {
        //4 - blob
        commit: '427c1517792af35842aeea569dfa54771c12e5a2',
        blobName: '07de9f0823e8befab652dd41657804cb2f3c3c62',
        fullBlob: '100644 blob d1105a6a48b55529a58049bf69733a1702b1b7b3    goshfile.yaml\n100644 blob 3b18e512dba79e4c8300dd08aeb37f8e728b8dad    sample.txt',
        ipfsBlob: '',
        prevSha: '',
        flags: 0
    },
    blob2_1: {
        //5 - blob
        commit: '427c1517792af35842aeea569dfa54771c12e5a2',
        blobName: 'd1105a6a48b55529a58049bf69733a1702b1b7b3',
        fullBlob: '# syntax=teamgosh/goshfile\n\napiVersion: 1\nimage: bash@sha256:b3abe4255706618c550e8db5ec0875328333a14dbf663e6f1e2b6875f45521e5\nentrypoint:\n  - sleep\n  - infinity\nsteps:\n  - name: print hello\n    run:\n      command: ["/usr/local/bin/bash"]\n      args:\n        - -c\n        - >-\n          echo "Hello gosh" > /message.txt\n',
        ipfsBlob: '',
        prevSha: '',
        flags: 0
    },
    commit3: {
        //6 - commit3
        sha: '62410456dfdf656301b69ee42634ae49bde027ec',
        parents: [],
        content: 'tree 54728f8a8308ab563d1d3e94d15daca72eb44d2b\nparent 427c1517792af35842aeea569dfa54771c12e5a2\nauthor Vasily Selivanov <gosh@evex.io> 1651485674 +0300\ncommitter Vasily Selivanov <gosh@evex.io> 1651485674 +0300\n\nupdate sample.txt',
    },
    tree3_1: {
        //7 - blob
        commit: '62410456dfdf656301b69ee42634ae49bde027ec',
        blobName: '54728f8a8308ab563d1d3e94d15daca72eb44d2b',
        fullBlob: '100644 blob d1105a6a48b55529a58049bf69733a1702b1b7b3    goshfile.yaml\n100755 blob af5626b4a114abcb82d63db7c8082c3c4756e51b    sample.txt',
        ipfsBlob: '',
        prevSha: '',
        flags: 0
    },
    blob3_1: {
        //8 - blob
        commit: '62410456dfdf656301b69ee42634ae49bde027ec',
        blobName: 'af5626b4a114abcb82d63db7c8082c3c4756e51b',
        fullBlob: 'Hello, world!',
        ipfsBlob: '',
        prevSha: '',
        flags: 0
    }
};
