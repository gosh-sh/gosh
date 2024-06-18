/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/request/README.md]]
 * @packageDocumentation
 * @module request
 */
import type { AjaxOptions, IAjax, IRequest, IResponse, RejectablePromise } from "../../types";
import "./config";
export declare class Ajax<T extends object = any> implements IAjax<T> {
    className(): string;
    private __async;
    constructor(options: Partial<AjaxOptions>, defaultAjaxOptions?: AjaxOptions);
    static log: IRequest[];
    private readonly xhr;
    private __buildParams;
    options: AjaxOptions;
    get o(): this['options'];
    abort(): Ajax;
    private __isFulfilled;
    private __activated;
    send(): RejectablePromise<IResponse<T>>;
    prepareRequest(): IRequest;
    private __isDestructed;
    destruct(): void;
}
