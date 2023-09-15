export function processOutputDump(p: Deno.CommandOutput): string {
    const stdout = new TextDecoder().decode(p.stdout)
    const stderr = new TextDecoder().decode(p.stderr)

    const stdout_trimmed = stdout.slice(0, 300)
    const stderr_trimmed = stderr.slice(0, 300)

    return `\
Stdout:
${stdout_trimmed}
Stderr:
${stderr_trimmed}
`
}
