/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isArray } from "./core/helpers/checker/is-array.js";
import ar from "./langs/ar.js";
import cs_cz from "./langs/cs_cz.js";
import de from "./langs/de.js";
import en from "./langs/en.js";
import es from "./langs/es.js";
import fi from "./langs/fi.js";
import fr from "./langs/fr.js";
import he from "./langs/he.js";
import hu from "./langs/hu.js";
import id from "./langs/id.js";
import it from "./langs/it.js";
import ja from "./langs/ja.js";
import keys from "./langs/keys.js";
import ko from "./langs/ko.js";
import mn from "./langs/mn.js";
import nl from "./langs/nl.js";
import pl from "./langs/pl.js";
import pt_br from "./langs/pt_br.js";
import ru from "./langs/ru.js";
import tr from "./langs/tr.js";
import zh_cn from "./langs/zh_cn.js";
import zh_tw from "./langs/zh_tw.js";
let exp = {};
exp = {
    ar,
    cs_cz,
    de,
    en,
    es,
    fi,
    fr,
    he,
    hu,
    id,
    it,
    ja,
    ko,
    mn,
    nl,
    pl,
    pt_br,
    ru,
    tr,
    zh_cn,
    zh_tw
};
/* Unpack array to hash */
const get = (value) => value ? value.default || value : {}, hashLang = {};
if (isArray(get(keys))) {
    get(keys).forEach((key, index) => {
        hashLang[index] = key;
    });
}
Object.keys(exp).forEach((lang) => {
    const list = get(exp[lang]);
    if (isArray(list)) {
        exp[lang] = {};
        list.forEach((value, index) => {
            exp[lang][hashLang[index]] = value;
        });
    }
    else {
        exp[lang] = list;
    }
});
export default exp;
