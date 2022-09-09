export function now(): number {
    return Math.trunc(Date.now() / 1000);
}

export function nowms(): number {
    return Math.trunc(Date.now());
}

export function nls(): string {
    return new Date().toLocaleString();
}