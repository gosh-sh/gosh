/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Plugin } from "../../core/plugin";
/**
 * Process drag and drop image from FileBrowser and movev image inside the editor
 */
export declare class dragAndDrop extends Plugin {
    private isFragmentFromEditor;
    private isCopyMode;
    private startDragPoint;
    private draggable;
    private bufferRange;
    /** @override */
    afterInit(): void;
    private onDragStart;
    private addDragListeners;
    private removeDragListeners;
    private onDrag;
    private onDragEnd;
    private onDrop;
    private getText;
    /** @override */
    beforeDestruct(): void;
}
