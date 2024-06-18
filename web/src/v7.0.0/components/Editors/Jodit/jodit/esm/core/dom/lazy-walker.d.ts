/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module dom
 */
import type { IAsync, IDestructible } from "../../types";
import { Eventify } from "../event-emitter/eventify";
export declare class LazyWalker extends Eventify<{
    visit: (node: Node) => boolean;
    break: (reason?: string) => void;
    end: (affect: boolean) => void;
}> implements IDestructible {
    private readonly async;
    private readonly options;
    private workNodes;
    setWork(root: Node): this;
    private hadAffect;
    private isWorked;
    private isFinished;
    constructor(async: IAsync, options?: {
        readonly timeout?: number;
        readonly whatToShow?: number;
        readonly reverse?: boolean;
        readonly timeoutChunkSize?: number;
    });
    private idleId;
    private startIdleRequest;
    break(reason?: string): void;
    end(): void;
    private stop;
    destruct(): void;
    private workPerform;
    private visitNode;
}
