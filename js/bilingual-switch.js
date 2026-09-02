(function () {
  'use strict';

  var STORAGE_KEY = 'zhw-site-language';
  var catalog = { routes: {}, categoriesEn: {}, tagsEn: {} };
  var currentLanguage = 'zh';

  var uiEnglish = {
    '首页': 'Home',
    '归档': 'Archive',
    '分类': 'Categories',
    '标签': 'Tags',
    '友链': 'Links',
    '友情链接': 'Links',
    '关于': 'About',
    '搜索': 'Search',
    '关键词': 'Keywords',
    '文章分类': 'Article Categories',
    '文章标签': 'Article Tags',
    '标签云': 'Tag Cloud',
    '博客现在还活着': 'The Blog Is Still Alive',
    '随便看看': 'Random Reading',
    '抽一篇旧文章': 'Pick an Older Post',
    '全站数据': 'Site Statistics',
    '文章': 'Posts',
    '约计字数': 'Approx. Words',
    '写作日': 'Writing Days',
    '过去一年的写作热力图': 'Writing Activity over the Past Year',
    '最近一周常听': 'Most Played This Week',
    '主页 ↗': 'Profile ↗',
    '少': 'Less',
    '多': 'More',
    '没有更多了': 'No More Posts',
    '上一页': 'Previous',
    '下一页': 'Next',
    '阅读更多': 'Read More',
    '总访问量': 'Total Views',
    '总访客数': 'Visitors',
    '在看什么呢雑魚~': 'What are you looking for?',
    '次': 'views',
    '人': 'people',
    '博客在允许 JavaScript 运行的环境下浏览效果更佳': 'This blog works best with JavaScript enabled.',
    '好大儿的博客': "My dear son's blog",
    '喵喵喵，可在下方留言加入link喵！格式如下喵：': 'Meow—leave a comment below if you would like to exchange links. Please use this format:',
    '博客名：喵喵喵': 'Blog name: Meow Meow Meow',
    '简介：喵喵喵，喵喵喵喵': 'Introduction: Meow meow, meow meow meow',
    '链接：https://喵喵喵.com': 'Link: https://喵喵喵.com',
    '图片：avatar.jpg': 'Image: avatar.jpg'
  };

  function normalizePath(value) {
    var path = String(value || '/').split('?')[0].split('#')[0];
    if (path.charAt(0) !== '/') path = '/' + path;
    if (!/\.[a-z0-9]+$/i.test(path) && path.charAt(path.length - 1) !== '/') path += '/';
    return path;
  }

  function routeEntry(pathname) {
    var path = normalizePath(pathname);
    if (catalog.routes[path]) return catalog.routes[path];
    var keys = Object.keys(catalog.routes || {});
    for (var index = 0; index < keys.length; index += 1) {
      var entry = catalog.routes[keys[index]];
      if (normalizePath(entry.en) === path) return entry;
    }
    return null;
  }

  function explicitRouteLanguage(pathname) {
    if (/^\/en\/(?:posts\/|about\/?)/.test(pathname)) return 'en';
    if (/^\/(?:posts\/|about\/?)/.test(pathname)) return 'zh';
    return null;
  }

  function storedLanguage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
    } catch (error) {
      return 'zh';
    }
  }

  function rememberLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // The switch still works for the current page when storage is unavailable.
    }
  }

  function makeLanguageButton() {
    if (document.getElementById('language-toggle-btn')) return;
    var colorToggle = document.getElementById('color-toggle-btn');
    var navList = colorToggle && colorToggle.parentNode;
    if (!navList) return;

    var item = document.createElement('li');
    item.className = 'nav-item';
    item.id = 'language-toggle-btn';

    var link = document.createElement('a');
    link.className = 'nav-link global-language-toggle';
    link.href = 'javascript:;';
    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', 'Switch site language');

    var label = document.createElement('span');
    label.className = 'global-language-toggle__label';
    link.appendChild(label);
    item.appendChild(link);

    if (colorToggle.nextSibling) navList.insertBefore(item, colorToggle.nextSibling);
    else navList.appendChild(item);

    link.addEventListener('click', function (event) {
      event.preventDefault();
      switchLanguage(currentLanguage === 'en' ? 'zh' : 'en');
    });
  }

  function textMap() {
    var map = Object.assign({}, uiEnglish, catalog.categoriesEn || {}, catalog.tagsEn || {});
    Object.keys(catalog.routes || {}).forEach(function (key) {
      var entry = catalog.routes[key];
      if (entry.zhTitle && entry.enTitle) map[entry.zhTitle] = entry.enTitle;
      if (entry.zhExcerpt && entry.enExcerpt) map[entry.zhExcerpt] = entry.enExcerpt;
    });
    return map;
  }

  function mappedText(value, map) {
    var trimmed = String(value || '').trim();
    if (Object.prototype.hasOwnProperty.call(map, trimmed)) return map[trimmed];
    if (trimmed.charAt(0) === '#' && Object.prototype.hasOwnProperty.call(map, trimmed.slice(1))) {
      return '#' + map[trimmed.slice(1)];
    }
    return null;
  }

  function skipTextNode(node) {
    var parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script, style, code, pre, .markdown-body, .katex, .MathJax'));
  }

  function translateTextNodes(root, language) {
    if (!root) return;
    var map = textMap();
    var walker = document.createTreeWalker(root, window.NodeFilter.SHOW_TEXT);
    var node;

    while ((node = walker.nextNode())) {
      if (skipTextNode(node)) continue;
      var original = node.__zhwOriginalText || node.nodeValue;
      if (!node.__zhwOriginalText) node.__zhwOriginalText = original;
      if (language === 'zh') {
        node.nodeValue = original;
        continue;
      }

      var trimmed = original.trim();
      var replacement = mappedText(trimmed, map);
      if (replacement !== null) node.nodeValue = original.replace(trimmed, replacement);
    }
  }

  function translateAttributes(root, language) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    var map = textMap();
    var elements = root.querySelectorAll('[alt], [title], [placeholder], [aria-label], [data-typed-text]');
    Array.prototype.forEach.call(elements, function (element) {
      if (element.classList.contains('global-language-toggle')) return;
      ['alt', 'title', 'placeholder', 'aria-label', 'data-typed-text'].forEach(function (attribute) {
        if (!element.hasAttribute(attribute)) return;
        var key = 'zhwOriginal' + attribute.replace(/(^|-)([a-z])/g, function (_, dash, letter) { return letter.toUpperCase(); });
        var original = element.dataset[key] || element.getAttribute(attribute);
        if (!element.dataset[key]) element.dataset[key] = original;
        if (language === 'zh') {
          element.setAttribute(attribute, original);
          return;
        }
        var replacement = mappedText(original, map);
        if (replacement !== null) element.setAttribute(attribute, replacement);
      });
    });
  }

  function setUntranslatedVisibility(language) {
    document.querySelectorAll('[data-zhw-untranslated]').forEach(function (element) {
      element.hidden = false;
      element.removeAttribute('data-zhw-untranslated');
    });
    if (language !== 'en') return;

    document.querySelectorAll('a[href^="/posts/"]').forEach(function (anchor) {
      if (routeEntry(anchor.getAttribute('href'))) return;
      var container = anchor.closest('.index-card, .archive-item, .list-group-item, .post-item, li');
      if (!container || container.closest('#navbarSupportedContent')) return;
      container.setAttribute('data-zhw-untranslated', 'true');
      container.hidden = true;
    });
  }

  function updatePostLinks(language) {
    var anchors = document.querySelectorAll('a[href]');
    Array.prototype.forEach.call(anchors, function (anchor) {
      var rawHref = anchor.getAttribute('href');
      if (!rawHref || /^(?:javascript:|mailto:|https?:|#)/i.test(rawHref)) return;
      var entry = routeEntry(rawHref);
      if (!entry) return;
      var image = anchor.querySelector('img');
      if (image) image.setAttribute('alt', language === 'en' ? entry.enTitle : entry.zhTitle);
      if (anchor.classList.contains('index-excerpt')) {
        var excerptTarget = anchor.querySelector('div') || anchor;
        var excerpt = language === 'en' ? entry.enExcerpt : entry.zhExcerpt;
        if (excerpt) excerptTarget.textContent = excerpt;
      }
      if (anchor.classList.contains('search-list-title')) {
        anchor.textContent = language === 'en' ? entry.enTitle : entry.zhTitle;
      }
      anchor.setAttribute('href', language === 'en' ? entry.en : entry.zh);
    });

    var aboutLink = document.querySelector('#navbarSupportedContent a[href="/about/"], #navbarSupportedContent a[href="/en/about/"]');
    if (aboutLink) aboutLink.setAttribute('href', language === 'en' ? '/en/about/' : '/about/');

    document.querySelectorAll('a.index-excerpt[href]').forEach(function (anchor) {
      var entry = routeEntry(anchor.getAttribute('href'));
      if (!entry) return;
      var excerptTarget = anchor.querySelector('div') || anchor;
      var excerpt = language === 'en' ? entry.enExcerpt : entry.zhExcerpt;
      if (excerpt) excerptTarget.textContent = excerpt;
    });
    setUntranslatedVisibility(language);
  }

  function updateButton(language) {
    var button = document.querySelector('.global-language-toggle');
    var label = button && button.querySelector('.global-language-toggle__label');
    if (!button || !label) return;
    label.textContent = language === 'en' ? '中' : 'EN';
    button.setAttribute('lang', language === 'en' ? 'zh-CN' : 'en');
    button.setAttribute('title', language === 'en' ? '切换到中文' : 'Switch to English');
    button.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
  }

  function updateStandalonePageTitle(language) {
    if (!/^\/links\/?(?:index\.html)?$/.test(window.location.pathname)) return;
    if (!document.documentElement.dataset.zhwOriginalTitle) {
      document.documentElement.dataset.zhwOriginalTitle = document.title;
    }
    document.title = language === 'en'
      ? 'Links - HWのBLOGS'
      : document.documentElement.dataset.zhwOriginalTitle;
  }

  function applyDocumentLanguage(language) {
    currentLanguage = language;
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.documentElement.setAttribute('data-site-language', language);
    if (document.body) {
      document.body.classList.toggle('site-language-en', language === 'en');
      translateTextNodes(document.body, language);
      translateAttributes(document.body, language);
      updatePostLinks(language);
    }
    if (window.CONFIG) window.CONFIG.search_path = language === 'en' ? '/local-search-en.xml' : '/local-search.xml';
    updateStandalonePageTitle(language);
    updateButton(language);
    document.dispatchEvent(new CustomEvent('zhw:languageapplied', { detail: { language: language } }));
  }

  function targetForLanguage(language) {
    var path = normalizePath(window.location.pathname);
    var entry = routeEntry(path);
    if (entry) return language === 'en' ? entry.en : entry.zh;
    if (path === '/about/' || path === '/en/about/') return language === 'en' ? '/en/about/' : '/about/';
    if (language === 'en' && /^\/posts\//.test(path)) return '/';
    return null;
  }

  function routeFor(pathname, language) {
    var entry = routeEntry(pathname);
    return entry ? (language === 'en' ? entry.en : entry.zh) : pathname;
  }

  function switchLanguage(language) {
    rememberLanguage(language);
    var target = targetForLanguage(language);
    if (target && normalizePath(target) !== normalizePath(window.location.pathname)) {
      window.location.assign(target + window.location.search + window.location.hash);
      return;
    }
    applyDocumentLanguage(language);
  }

  function loadCatalog() {
    return fetch('/data/site-language.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        catalog = data || catalog;
        applyDocumentLanguage(currentLanguage);
      })
      .catch(function (error) {
        console.warn('[site-language] catalog unavailable:', error.message);
      });
  }

  function init() {
    var routeLanguage = explicitRouteLanguage(window.location.pathname);
    currentLanguage = routeLanguage || storedLanguage();
    if (routeLanguage) rememberLanguage(routeLanguage);
    makeLanguageButton();
    applyDocumentLanguage(currentLanguage);
    observeDynamicContent();
    loadCatalog();
  }

  document.addEventListener('zhw:dashboardmounted', function () {
    applyDocumentLanguage(currentLanguage);
  });

  document.addEventListener('zhw:dashboardrendered', function () {
    if (!document.body) return;
    translateTextNodes(document.body, currentLanguage);
    translateAttributes(document.body, currentLanguage);
    updatePostLinks(currentLanguage);
  });

  var mutationTimer = null;
  function observeDynamicContent() {
    if (!document.body || !window.MutationObserver) return;
    var observer = new MutationObserver(function () {
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(function () {
        if (currentLanguage !== 'en') return;
        translateTextNodes(document.body, currentLanguage);
        translateAttributes(document.body, currentLanguage);
        updatePostLinks(currentLanguage);
      }, 30);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.ZHWSiteLanguage = {
    current: function () { return currentLanguage; },
    routeFor: routeFor,
    entryFor: function (pathname) { return routeEntry(pathname); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
