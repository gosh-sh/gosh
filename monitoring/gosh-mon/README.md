# Gosh monitoring service

Implements high-level tests including browser ones using puppeteer
and gosh git remote helper ones by using git directly.

Can be used in monitoring mode (default, specify GM_MODE env, see
config and docker compose file) or in direct execution mode for CI/CD.

## Direct execution

To directly execute test provide `RUN_NOW=1` env and provide test config
name with `GM_MODE` env. See `config.yml` `modes` config for possible modes.

You can override config parameters by providing `CONFIG_...` envs.

For example, you can override root address with `CONFIG_ROOT` env.

In this mode return code is 0 on success or (100 + number of completed test
steps) if execution fails.

### P.S. Some notes

For correct execution make sure that this is the current directory.
That is, execute application like `node app/app.js`.

To see the required dependencies to run puppeteer on server it might be
useful to inspect Dockerfile and learn about them from it's contents.

For most tests the configured repository and branch shall already exist
and must contain the specified file. Also for remote tests make sure that
root is correctly confiured - as of now there is no way to automatically
extract current root, you can only verify it against site footer.
