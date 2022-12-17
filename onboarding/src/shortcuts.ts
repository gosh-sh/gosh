export async function run_bash({
    script,
    env,
}: {
    script: string
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
