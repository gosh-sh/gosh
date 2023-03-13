# Build

```
make install
```

# Usage

Dispatcher manages git-remote-gosh binaries capable to work with different versions of GOSH.
To work with dispatcher user should get a set of binaries:
 - `git-remote-gosh` (gosh-dispatcher)
 - one or more `git-remote-gosh_vX_x_x` (git-remote-gosh binary for particular version of GOSH)

Then user should prepare an ini file for dispatcher, which contains paths to git-remote-gosh binaries.
Example of the ini file for dispatcher, when git-remote-gosh binaries lie near dispatcher:

```bash
git-remote-gosh_v1_0_0
git-remote-gosh_v2_0_0

```

Dispatcher loads path to ini file from such sources (in order of priority):
1) from `GOSH_INI_PATH` environment variable  (the most prioritized)
2) from home directory: `~/.gosh/dispatcher.ini`
3) from the current directory: `dispatcher.ini`

To get actual ini file path and list of remotes user can call command:

```bash
$ git-remote-gosh dispatcher_ini
Dispatcher git-remote-gosh v3.0.0
GOSH dispatcher ini path: "/home/user/.gosh/dispatcher.ini"
Remote versions:
[
    "git-remote-gosh_v1_0_0",
    "git-remote-gosh_v2_0_0",
    "git-remote-gosh_v9998_0_0",
    "git-remote-gosh_v9999_0_0",
]

$ GOSH_INI_PATH=/tmp/dummy.ini git-remote-gosh dispatcher_ini
Dispatcher git-remote-gosh v3.0.0
GOSH dispatcher ini path: "/tmp/dummy.ini"
Remote versions:
[
    "git-remote-gosh_vX_x_x",
]
```