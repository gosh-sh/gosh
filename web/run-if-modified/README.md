# run-if-modified

The idea for this project came up with the need to create a code build only if a file becomes modified. This way, it is possible to reduce the compilation and transpilation time considerably.

# TL-DR

```
$ rim -h
Usage: rim -s '.cache' -m '**/*.svg' npm run build-svg

Options:
  -V, --version            output the version number
  -m, --minimatch <match>  Files scanned for changes (default: "src/**/*.{tsx,ts,jsx,js,svg,html,css,scss,less}")
                           Multiple patterns can be used (-m "src/**/* | package.json | somefile")
  -s, --snapshot <file>    Snapshot files (default: ".run-on-diff.cache.json")
  -h, --help               display help for command
```

# License

Read the license [MIT by clicking here](LICENSE.md)
