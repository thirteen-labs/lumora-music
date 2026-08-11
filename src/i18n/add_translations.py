import sys

FILE = r'C:\Users\obsid\Desktop\lumora_app\src\i18n\translations.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Japanese new keys
ja_new = """    // About
    'about.title': '\u30eb\u30e2\u30e9\u306b\u3064\u3044\u3066',
    'about.version': '\u30d0\u30fc\u30b8\u30e7\u30f3',
    'about.developer': '\u958b\u767a\u8005',
    'about.platform': '\u30d7\u30e9\u30c3\u30c8\u30d5\u30a9\u30fc\u30e0',
    'about.description': '\u30d7\u30ec\u30df\u30a5\u30e0\u30aa\u30d5\u30e9\u30a4\u30f3\u30e1\u30c7\u30a3\u30a2\u30d7\u30ec\u30a4\u30e4\u30fc',

    // Privacy
    'privacy.title': '\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc',
    'privacy.header': '\u3042\u306a\u305f\u306e\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u306f\u5927\u5207\u3067\u3059',
    'privacy.description': 'Lumora\u306f\u5b8c\u5168\u306b\u30aa\u30d5\u30e9\u30a4\u30f3\u3067\u52d5\u4f5c\u3059\u308b\u3088\u3046\u8a2d\u8a08\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u30c7\u30fc\u30bf\u306e\u53ce\u96c6\u3001\u8ffd\u8de1\u3001\u5171\u6709\u306f\u4e00\u5207\u884c\u308f\u308c\u307e\u305b\u3093\u3002',
    'privacy.offline': '\u30aa\u30d5\u30e9\u30a4\u30f3\u30e2\u30fc\u30c9',
    'privacy.offline.desc': '\u30a4\u30f3\u30bf\u30fc\u30cd\u30c3\u30c8\u63a5\u7d9a\u306f\u4e0d\u8981',
    'privacy.no.collection': '\u30c7\u30fc\u30bf\u53ce\u96c6\u306a\u3057',
    'privacy.no.collection.desc': '\u3042\u306a\u305f\u306e\u30c7\u30fc\u30bf\u306f\u30c7\u30d0\u30a4\u30b9\u306b\u6b8b\u308a\u307e\u3059',
    'privacy.no.analytics': '\u30a2\u30ca\u30ea\u30c6\u30a3\u30af\u30b9\u306a\u3057',
    'privacy.no.analytics.desc': '\u4f7f\u7528\u5206\u6790\u306f\u7121\u52b9\u306b\u306a\u3063\u3066\u3044\u307e\u3059',

    // Help
    'help.title': '\u30d8\u30eb\u30d7\u3068\u30b5\u30dd\u30fc\u30c8',
    'help.faqs': '\u3088\u304f\u3042\u308b\u8cea\u554f',
    'help.faqs.desc': '\u3088\u304f\u3042\u308b\u8cea\u554f',
    'help.contact': '\u30b5\u30dd\u30fc\u30c8\u306b\u9023\u7d61',
    'help.contact.desc': '\u30c1\u30fc\u30e0\u304b\u3089\u30d8\u30eb\u30d7\u3092\u53d7\u3051\u308b',
    'help.report': '\u30d0\u30b0\u3092\u5831\u544a',
    'help.report.desc': '\u554f\u984c\u304c\u898b\u3064\u304b\u308a\u307e\u3057\u305f\u304b\uff1f',

    // Home (extended)
    'home.greeting.morning': '\u304a\u306f\u3088\u3046',
    'home.greeting.afternoon': '\u3053\u3093\u306b\u3061\u306f',
    'home.greeting.evening': '\u3053\u3093\u3070\u3093\u306f',
    'home.your.playlists': '\u3042\u306a\u305f\u306e\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8',
    'home.view.all': '\u3059\u3079\u3066\u8868\u793a',
    'home.see.all': '\u3059\u3079\u3066\u898b\u308b',
    'home.pick.up': '\u4e2d\u65ad\u3057\u305f\u3053\u3068\u304b\u3089\u518d\u958b',
    'home.for.you': '\u3042\u306a\u305f\u306e\u305f\u3081\u306b',
    'home.new.in.library': '\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u65b0\u7740',
    'home.your.favorites': '\u304a\u6c17\u306b\u5165\u308a',
    'home.liked.songs': '\u3044\u3044\u306d\u3057\u305f\u66f2',

    // Library (extended)
    'library.selected': '\u9078\u629e\u4e2d',
    'library.add.to.queue': '\u30ad\u30e5\u30fc\u306b\u8ffd\u52a0',
    'library.no.music': '\u97f3\u697d\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093',"""

# Find the end of the ja section
# Look for the pattern: ja section ending with 'library.with.lyrics' followed by }, then zh: {
ja_end_marker = "'library.with.lyrics': '\u6b4c\u8a5e\u4ed8\u304d',\n  },\n  zh: {"
idx = content.find(ja_end_marker)
if idx >= 0:
    content = content[:idx] + ja_end_marker.replace(
        "'library.with.lyrics': '\u6b4c\u8a5e\u4ed8\u304d',\n  },\n  zh: {",
        "'library.with.lyrics': '\u6b4c\u8a5e\u4ed8\u304d',\n\n" + ja_new + "\n  },\n  zh: {"
    )
    print("Added Japanese translations")
else:
    print("ERROR: Could not find ja section end marker")

# Chinese new keys
zh_new = """    // About
    'about.title': '\u5173\u4e8e Lumora',
    'about.version': '\u7248\u672c',
    'about.developer': '\u5f00\u53d1\u8005',
    'about.platform': '\u5e73\u53f0',
    'about.description': '\u9ad8\u7ea7\u79bb\u7ebf\u5a92\u4f53\u64ad\u653e\u5668',

    // Privacy
    'privacy.title': '\u9690\u79c1',
    'privacy.header': '\u60a8\u7684\u9690\u79c1\u5f88\u91cd\u8981',
    'privacy.description': 'Lumora \u8bbe\u8ba1\u4e3a\u5b8c\u5168\u79bb\u7ebf\u5de5\u4f5c\u3002\u4e0d\u4f1a\u6536\u96c6\u3001\u8ddf\u8e2a\u6216\u5171\u4eab\u60a8\u7684\u6570\u636e\u3002',
    'privacy.offline': '\u79bb\u7ebf\u6a21\u5f0f',
    'privacy.offline.desc': '\u65e0\u9700\u7f51\u7edc\u8fde\u63a5',
    'privacy.no.collection': '\u65e0\u6570\u636e\u6536\u96c6',
    'privacy.no.collection.desc': '\u60a8\u7684\u6570\u636e\u4fdd\u7559\u5728\u8bbe\u5907\u4e0a',
    'privacy.no.analytics': '\u65e0\u5206\u6790',
    'privacy.no.analytics.desc': '\u4f7f\u7528\u5206\u6790\u5df2\u7981\u7528',

    // Help
    'help.title': '\u5e2e\u52a9\u4e0e\u652f\u6301',
    'help.faqs': '\u5e38\u89c1\u95ee\u9898',
    'help.faqs.desc': '\u5e38\u89c1\u95ee\u9898',
    'help.contact': '\u8054\u7cfb\u652f\u6301',
    'help.contact.desc': '\u4ece\u6211\u4eec\u7684\u56e2\u961f\u83b7\u5f97\u5e2e\u52a9',
    'help.report': '\u62a5\u544a Bug',
    'help.report.desc': '\u53d1\u73b0\u95ee\u9898\u4e86\uff1f',

    // Home (extended)
    'home.greeting.morning': '\u65e9\u4e0a\u597d',
    'home.greeting.afternoon': '\u4e0b\u5348\u597d',
    'home.greeting.evening': '\u665a\u4e0a\u597d',
    'home.your.playlists': '\u60a8\u7684\u64ad\u653e\u5217\u8868',
    'home.view.all': '\u67e5\u770b\u5168\u90e8',
    'home.see.all': '\u67e5\u770b\u5168\u90e8',
    'home.pick.up': '\u4ece\u4e0a\u6b21\u505c\u6b62\u5904\u7ee7\u7eed',
    'home.for.you': '\u4e3a\u4f60\u63a8\u8350',
    'home.new.in.library': '\u5e93\u4e2d\u65b0\u5185\u5bb9',
    'home.your.favorites': '\u60a8\u7684\u6536\u85cf',
    'home.liked.songs': '\u559c\u6b22\u7684\u6b4c\u66f2',

    // Library (extended)
    'library.selected': '\u5df2\u9009\u62e9',
    'library.add.to.queue': '\u6dfb\u52a0\u5230\u64ad\u653e\u961f\u5217',
    'library.no.music': '\u672a\u627e\u5230\u97f3\u4e50',"""

zh_end_marker = "'library.with.lyrics': '\u542b\u6b4c\u8bcd',\n  },\n  pt: {"
idx = content.find(zh_end_marker)
if idx >= 0:
    content = content[:idx] + zh_end_marker.replace(
        "'library.with.lyrics': '\u542b\u6b4c\u8bcd',\n  },\n  pt: {",
        "'library.with.lyrics': '\u542b\u6b4c\u8bcd',\n\n" + zh_new + "\n  },\n  pt: {"
    )
    print("Added Chinese translations")
else:
    print("ERROR: Could not find zh section end marker")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved")
