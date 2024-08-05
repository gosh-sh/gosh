/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { convertMediaUrlToVideoEmbed } from "../../core/helpers/index.js";
import { Button } from "../../core/ui/button/index.js";
import { UIBlock, UIForm, UIInput, UITextArea } from "../../core/ui/form/index.js";
import { Icon } from "../../core/ui/icon.js";
import { TabsWidget } from "../../modules/widget/index.js";
import videoIcon from "./video.svg.js";
import { Config } from "../../config.js";
Icon.set('video', videoIcon);
Config.prototype.controls.video = {
    popup: (editor, current, close) => {
        const formLink = new UIForm(editor, [
            new UIBlock(editor, [
                new UIInput(editor, {
                    name: 'url',
                    required: true,
                    label: 'URL',
                    placeholder: 'https://',
                    validators: ['url']
                })
            ]),
            new UIBlock(editor, [
                Button(editor, '', 'Insert', 'primary').onAction(() => formLink.submit())
            ])
        ]), formCode = new UIForm(editor, [
            new UIBlock(editor, [
                new UITextArea(editor, {
                    name: 'code',
                    required: true,
                    label: 'Embed code'
                })
            ]),
            new UIBlock(editor, [
                Button(editor, '', 'Insert', 'primary').onAction(() => formCode.submit())
            ])
        ]), tabs = [], insertCode = (code) => {
            editor.s.restore();
            editor.s.insertHTML(code);
            close();
        };
        editor.s.save();
        tabs.push({
            icon: 'link',
            name: 'Link',
            content: formLink.container
        }, {
            icon: 'source',
            name: 'Code',
            content: formCode.container
        });
        formLink.onSubmit(data => {
            insertCode(convertMediaUrlToVideoEmbed(data.url));
        });
        formCode.onSubmit(data => {
            insertCode(data.code);
        });
        return TabsWidget(editor, tabs);
    },
    tags: ['iframe'],
    tooltip: 'Insert youtube/vimeo video'
};
