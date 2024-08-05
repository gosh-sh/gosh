/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module traits
 */
import type { IDialog, IDialogOptions, IDlgs, IViewBased } from "../../types";
export declare abstract class Dlgs implements IDlgs {
    dlg(this: IViewBased & IDlgs, options?: IDialogOptions): IDialog;
    confirm(this: IViewBased & IDlgs, msg: string, title: string | ((yes: boolean) => void) | undefined, callback?: (yes: boolean) => void | false): IDialog;
    prompt(this: IViewBased & IDlgs, msg: string, title: string | (() => false | void) | undefined, callback: (value: string) => false | void, placeholder?: string, defaultValue?: string): IDialog;
    alert(this: IViewBased & IDlgs, msg: string | HTMLElement, title?: string | (() => void | false), callback?: string | ((dialog: IDialog) => void | false), className?: string): IDialog;
}
