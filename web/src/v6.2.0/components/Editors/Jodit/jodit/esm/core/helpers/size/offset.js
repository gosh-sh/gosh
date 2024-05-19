/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export const offset = (elm, jodit, doc, recurse = false) => {
    let rect;
    try {
        rect = elm.getBoundingClientRect();
    }
    catch (e) {
        rect = {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0
        };
    }
    const body = doc.body, docElem = doc.documentElement || {
        clientTop: 0,
        clientLeft: 0,
        scrollTop: 0,
        scrollLeft: 0
    }, win = doc.defaultView || doc.parentWindow, scrollTop = win.pageYOffset || docElem.scrollTop || body.scrollTop, scrollLeft = win.pageXOffset || docElem.scrollLeft || body.scrollLeft, clientTop = docElem.clientTop || body.clientTop || 0, clientLeft = docElem.clientLeft || body.clientLeft || 0;
    let topValue, leftValue;
    const iframe = jodit.iframe;
    if (!recurse && jodit && jodit.options && jodit.o.iframe && iframe) {
        const { top, left } = offset(iframe, jodit, jodit.od, true);
        topValue = rect.top + top;
        leftValue = rect.left + left;
    }
    else {
        topValue = rect.top + scrollTop - clientTop;
        leftValue = rect.left + scrollLeft - clientLeft;
    }
    return {
        top: Math.round(topValue),
        left: Math.round(leftValue),
        width: rect.width,
        height: rect.height
    };
};
