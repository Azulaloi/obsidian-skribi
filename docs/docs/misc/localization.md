# Localization

Skribi has support for localization of its UI elements and other strings like the hover texts. At this time, it does not actually have any localization. If you're using Skribi at all (or are reading this), you probably understand English fairly well, but maybe having disparate languages in your UI bothers you - and if you're like me then anything that bothers you even slightly gets <strike>obliterated by space lasers</strike> elegantly resolved through a generous contribution of your time in the form of a pull request.

If you'd like to contribute, but don't know anything about git or npm or just don't want to make a pull request (and who does), just make a copy of the [EN](https://github.com/Azulaloi/obsidian-skribi/blob/master/src/lang/locale/en.json) file, translate the lines on the right, and send it to me.

If you want to add it yourself, it's the same thing but add it to <code>locales</code> in <a href='https://github.com/Azulaloi/obsidian-skribi/blob/master/src/lang/babel.ts'></code>babel.ts</code></a> instead of sending it to me. <a href='https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes'> Here are the locale codes </a> - although Obsidian only supports like 12 of those.