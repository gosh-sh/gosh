/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { $$ } from "../../core/helpers/index.js";
import { Icon } from "../../core/ui/icon.js";
import { FileSelectorWidget } from "../../modules/widget/index.js";
import imageIcon from "./image.svg.js";
import { Config } from "../../config.js";
Icon.set('image', imageIcon);
Config.prototype.controls.image = {
    popup: (editor, current, close) => {
        let sourceImage = null;
        if (current &&
            !Dom.isText(current) &&
            Dom.isHTMLElement(current) &&
            (Dom.isTag(current, 'img') || $$('img', current).length)) {
            sourceImage = Dom.isTag(current, 'img')
                ? current
                : $$('img', current)[0];
        }
        editor.s.save();
        return FileSelectorWidget(editor, {
            filebrowser: (data) => {
                editor.s.restore();
                data.files &&
                    data.files.forEach(file => editor.s.insertImage(data.baseurl + file, null, editor.o.imageDefaultWidth));
                close();
            },
            upload: true,
            url: async (url, text) => {
                editor.s.restore();
                if (/^[a-z\d_-]+(\.[a-z\d_-]+)+/i.test(url)) {
                    url = '//' + url;
                }
                const image = sourceImage || editor.createInside.element('img');
                image.setAttribute('src', url);
                image.setAttribute('alt', text);
                if (!sourceImage) {
                    await editor.s.insertImage(image, null, editor.o.imageDefaultWidth);
                }
                close();
            }
        }, sourceImage, close);
    },
    tags: ['img'],
    tooltip: 'Insert Image'
};
export function image(editor) {
    editor.registerButton({
        name: 'image',
        group: 'media'
    });
}
pluginSystem.add('image', image);
