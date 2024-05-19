/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IComponent, IContainer, IElms, IJodit, Nullable } from "../../../types";
import { UIGroup } from "../../../core/ui/group/group";
import type { ImagePropertiesAPI, ImagePropertiesState } from "../interface";

/** @private */
export declare class UIImagePropertiesForm extends UIGroup<IJodit> {
    private state;
    private handlers;
    className(): string;
    appendChildToContainer(): void;
    getElm<T extends IComponent & IContainer & IElms>(elementName: string): Nullable<HTMLElement>;
    private __mainTab;
    private __positionTab;
    constructor(jodit: IJodit, state: ImagePropertiesState, activeTabState: {
        activeTab: 'Image' | 'Advanced';
    }, handlers: ImagePropertiesAPI);
    protected render(): string;
    protected onChangeSizeIsLocked(): void;
    protected onLockSizeClick(): void;
    protected onStateValuesSizeChange(): void;
    protected onImageWidthChange(e: Event): void;
    protected onStateValuesImageSrcChange(): void;
    protected hideFieldByOptions(): void;
}
