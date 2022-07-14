export const classNames = (...classes: any[]): string =>
    classes.filter(Boolean).join(' ');

export const shortString = (
    data: string,
    start: number = 6,
    end: number = 6,
    delimiter: string = '...'
): string => {
    if (data.length <= start + end) return data;

    const left = data.substring(0, start);
    const right = data.substring(data.length - end);
    return `${left}${delimiter}${right}`;
};

export const sleep = (ms: number = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
