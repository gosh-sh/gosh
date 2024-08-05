/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/file-browser
 */
import type { IFileBrowserItemElement, IFileBrowserItemWrapper, ISource } from "../../../types";
export declare class FileBrowserItem implements IFileBrowserItemWrapper {
    readonly data: IFileBrowserItemElement;
    source: ISource;
    sourceName: string;
    type: IFileBrowserItemWrapper['type'];
    private constructor();
    static create(data: IFileBrowserItemElement): FileBrowserItem & IFileBrowserItemElement;
    get path(): string;
    get imageURL(): string;
    get fileURL(): string;
    get time(): string;
    get uniqueHashKey(): string;
    toJSON(): object;
}
