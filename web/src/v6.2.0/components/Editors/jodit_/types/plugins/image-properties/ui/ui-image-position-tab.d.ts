/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IJodit } from "../../../types";
import { UIElement } from "../../../core/ui/element";
import type { ImagePropertiesAPI, ImagePropertiesState } from "../interface";
/** @private */
export declare class UIImagePositionTab extends UIElement<IJodit> {
    private state;
    protected handlers: ImagePropertiesAPI;
    className(): string;
    constructor(jodit: IJodit, state: ImagePropertiesState, handlers: ImagePropertiesAPI);
    protected render({ availableClasses }: {
        availableClasses?: string[] | Array<[
            string,
            string
        ]>;
    }): string;
    protected onStateAlignChange(): void;
    protected onChangeAlign(): void;
    protected onStateValuesBorderRadiusChange(): void;
    protected onChangeBorderRadius(): void;
    protected onStateValuesIdChange(): void;
    protected onChangeId(): void;
    protected onStateValuesStyleChange(): void;
    protected onChangeStyle(): void;
    protected onStateValuesClassesChange(): void;
    protected onChangClasses(): void;
    protected onLockMarginClick(e: MouseEvent): void;
    protected onChangeMarginIsLocked(): void;
    protected onStateValuesMarginChange(): void;
    protected onChangeMargin(): void;
    protected hideFieldByOptions(): void;
}
