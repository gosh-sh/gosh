/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Removes a file from the server
 * @private
 */
export function deleteFile(fb, name, source) {
    return fb.dataProvider
        .fileRemove(fb.state.currentPath, name, source)
        .then(message => {
        fb.status(message || fb.i18n('File "%s" was deleted', name), true);
    })
        .catch(fb.status);
}
