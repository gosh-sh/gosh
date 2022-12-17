export async function run_bash({
    script,
    env,
}: {
    script: string
    // deno-lint-ignore no-explicit-any
    env: any
}): Promise<{ status: Deno.ProcessStatus; stdout: string; stderr: string }> {
    const p = Deno.run({
        cmd: ['bash', script],
        stdout: 'piped',
        stderr: 'piped',
        env: env,
    })
    const [status, stdout, stderr] = await Promise.all([
        p.status(),
        p.output().then((res) => new TextDecoder().decode(res)),
        p.stderrOutput().then((res) => new TextDecoder().decode(res)),
    ])
    return { status, stdout, stderr }
}

export async function tonos_cli(...args: string[]) {
    const cmd = ['tonos-cli', '-j', ...args]
    const p = Deno.run({
        cmd,
        stderr: 'piped',
        stdout: 'piped',
    })
    const [status, stdout, stderr] = await Promise.all([
        p.status(),
        p.output().then((res) => new TextDecoder().decode(res)),
        p.stderrOutput().then((res) => new TextDecoder().decode(res)),
    ])
    if (stderr) {
        console.log('Stderr:', stderr)
    }
    if (status.success) {
        return JSON.parse(stdout)
    }
    throw new Error(`Process "${cmd.join(' ')}" return code ${status.code}`)
}
