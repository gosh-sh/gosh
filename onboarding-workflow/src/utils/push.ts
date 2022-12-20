export const pushRepo = async (from: string, to: string) => {
    const p = Deno.run({
        cmd: ['git', 'push'],
    })
    const { code } = await p.status()
}
