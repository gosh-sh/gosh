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