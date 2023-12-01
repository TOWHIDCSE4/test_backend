import { I18n } from 'i18n';
import path from 'path';

const i18n = new I18n();
i18n.configure({
    locales: ['en', 'vi'],
    directory: path.join(__dirname, '.'),
    cookie: 'NEXT_LOCALE',
    header: 'accept-language',
    autoReload: true,
    queryParameter: 'lang',
    api: {
        __: 't',
        __n: 'tn'
    },
    objectNotation: false,
    defaultLocale: 'en'
});

export { i18n };
