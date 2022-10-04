import {serialize, deserialize} from 'v8';

export function now(): number {
    return Math.trunc(Date.now() / 1000);
}

export function nowms(): number {
    return Math.trunc(Date.now());
}

export function nls(): string {
    return new Date().toLocaleString();
}

export function niso(): string {
    return new Date().toISOString();
}

export function clone(obj: any): any {
    return deserialize(serialize(obj));
}

export function hrefs(...urls: string[]): string {
    return urls.map((s) => `@href='${s}'`).join(' or ');
}

export function or_hrefs(url: string): string {
    const parts = url.split('/');
    //  /o/${or}/r/${re}/blobs/view/${br}/${fn}
    // 0 1 2     3 4     5     6    7     8
    if (parts[3] === 'r') parts.splice(3, 1);
    if (parts[1] === 'o') parts.splice(1, 1);
    return hrefs(url, parts.join('/'));
}

export function ac_hrefs(url: string): string {
    return hrefs(url, url.replaceAll('/a/', '/account/'));
}

export function limstr(s: string, l: number): string {
    return s.length <= l ? s : (s.substring(0, l) + '...');
}

export function ifdef(pref: string, val: any): string {
    return val !== undefined ? `${pref}${val}` : '';
}

export function iftrue(text: string, cond?: boolean): string {
    return cond === true ? text : '';
}