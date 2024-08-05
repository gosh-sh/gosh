/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Process drag and drop image or another element inside the editor
 */
export declare class dragAndDropElement extends Plugin {
    private dragList;
    private draggable;
    private isCopyMode;
    /**
     * Shift in pixels after which we consider that the transfer of the element has begun
     */
    private diffStep;
    private startX;
    private startY;
    private state;
    /** @override */
    protected afterInit(): void;
    /**
     * Drag start handler
     */
    private onDragStart;
    /**
     * Mouse move handler handler
     */
    private onDrag;
    /**
     * Mouseup handler in any place
     */
    private onDragEnd;
    /**
     * Mouseup handler inside editor
     */
    private onDrop;
    /**
     * Add global event listener after drag start
     */
    private addDragListeners;
    /**
     * Remove global event listener after drag start
     */
    private removeDragListeners;
    /** @override */
    protected beforeDestruct(): void;
}
