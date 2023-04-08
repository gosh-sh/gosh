export function getRepoNameFromUrl(url: string) {
    return url.split('/').at(-1)
}
