const { spawnSync } = require("node:child_process");
const { realpathSync } = require("node:fs");

const projectRoot = realpathSync.native(process.cwd());
const nextCli = realpathSync.native(require.resolve("next/dist/bin/next"));
const result = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    INIT_CWD: projectRoot,
    PWD: projectRoot,
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
