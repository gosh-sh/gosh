export async function runBash({
    script,
    env,
}: {
    script: string
    // deno-lint-ignore no-explicit-any
    env: any
}): Promise<{ code: number; stdout: string; stderr: string }> {
    const command = new Deno.Command("bash", {
        args: [script],
        stdout: 'piped',
        stderr: 'piped',
        env: env,
    })

    const { code, stdout, stderr } = await command.output()

    return { code, stdout: new TextDecoder().decode(stdout), stderr: new TextDecoder().decode(stderr)}
}

export async function goshCli(...args: string[]) {
    const cmd_args = ['-j', ...args]
    const display_cmd = cmd_args.map((x) => `'${x}'`).join(' ')

    // Print current time
    const now = new Date();
    console.debug(`Current timestamp: ${now}`)

    console.debug(`gosh cli: ${display_cmd}`)
    const p = new Deno.Command('gosh-cli', {
        args: cmd_args,
        stderr: 'piped',
        stdout: 'piped',
    })
    const status = await p.output()

    const stdout = new TextDecoder().decode(status.stdout)
    const stderr = new TextDecoder().decode(status.stderr)

    if (stderr) {
        console.log('Stderr:', stderr)
    }
    console.log('Status:', status)
    if (status.success) {
        return JSON.parse(stdout)
    }
    throw new Error(`Process "${display_cmd}" return code ${status.code}\n${stdout}`)
}
