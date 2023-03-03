export async function processOutputDump(p: Deno.Process): Promise<string> {
    const stdout = new TextDecoder().decode(await p.output())
    const stderr = new TextDecoder().decode(await p.stderrOutput())

    const stdout_trimmed = stdout.slice(0, 300)
    const stderr_trimmed = stderr.slice(0, 300)

    return `\
Stdout:
${stdout_trimmed}
Stderr:
${stderr_trimmed}
`
}
