/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/toolbar/collection
 */
import type { IBound, IJodit, IToolbarButton } from "../../../types";
import { ToolbarCollection } from "./collection";
export declare class ToolbarEditorCollection extends ToolbarCollection<IJodit> {
    /** @override */
    className(): string;
    /** @override */
    shouldBeDisabled(button: IToolbarButton): boolean;
    /** @override */
    shouldBeActive(button: IToolbarButton): boolean;
    private checkActiveStatus;
    /** @override */
    getTarget(button: IToolbarButton): Node | null;
    /** @override */
    constructor(jodit: IJodit);
    /**
     * Adds an invisible element to the container that can handle the
     * situation when the editor is inside the <label>
     *
     * @see https://github.com/jodit/jodit-react/issues/138
     */
    private prependInvisibleInput;
    /**
     * Show the inline toolbar inside WYSIWYG editor.
     * @param bound - you can set the place for displaying the toolbar,
     * or the place will be in the place of the cursor
     */
    showInline(bound?: IBound): void;
    hide(): void;
    show(): void;
}
