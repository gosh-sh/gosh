/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { autobind } from "../decorators/index.js";
import { Dom } from "./dom.js";
import { Eventify } from "../event-emitter/eventify.js";
export class LazyWalker extends Eventify {
    setWork(root) {
        if (this.isWorked) {
            this.break();
        }
        this.workNodes = Dom.eachGen(root, !this.options.reverse);
        this.isFinished = false;
        this.startIdleRequest();
        return this;
    }
    constructor(async, options = {}) {
        super();
        this.async = async;
        this.options = options;
        this.workNodes = null;
        this.hadAffect = false;
        this.isWorked = false;
        this.isFinished = false;
        this.idleId = 0;
    }
    startIdleRequest() {
        this.idleId = this.async.requestIdleCallback(this.workPerform, {
            timeout: this.options.timeout ?? 10
        });
    }
    break(reason) {
        if (this.isWorked) {
            this.stop();
            this.emit('break', reason);
        }
    }
    end() {
        if (this.isWorked) {
            this.stop();
            this.emit('end', this.hadAffect);
            this.hadAffect = false;
        }
    }
    stop() {
        this.isWorked = false;
        this.isFinished = true;
        this.workNodes = null;
        this.async.cancelIdleCallback(this.idleId);
    }
    destruct() {
        super.destruct();
        this.stop();
    }
    workPerform(deadline) {
        if (this.workNodes) {
            this.isWorked = true;
            let count = 0;
            const chunkSize = this.options.timeoutChunkSize ?? 50;
            while (!this.isFinished &&
                (deadline.timeRemaining() > 0 ||
                    (deadline.didTimeout && count <= chunkSize))) {
                const item = this.workNodes.next();
                count += 1;
                if (this.visitNode(item.value)) {
                    this.hadAffect = true;
                }
                if (item.done) {
                    this.end();
                    return;
                }
            }
        }
        else {
            this.end();
        }
        if (!this.isFinished) {
            this.startIdleRequest();
        }
    }
    visitNode(nodeElm) {
        if (!nodeElm ||
            (this.options.whatToShow !== undefined &&
                nodeElm.nodeType !== this.options.whatToShow)) {
            return false;
        }
        return this.emit('visit', nodeElm) ?? false;
    }
}
__decorate([
    autobind
], LazyWalker.prototype, "workPerform", null);
