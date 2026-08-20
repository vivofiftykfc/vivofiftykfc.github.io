(function () {
  'use strict';

  function languageRoute(pathname) {
    var englishPost = pathname.match(/^\/en(\/posts\/.*)$/);
    var chinesePost = pathname.match(/^(\/posts\/.*)$/);
    var englishAbout = pathname.match(/^\/en(\/about\/?$)/);
    var chineseAbout = pathname.match(/^(\/about\/?$)/);

    if (englishPost || englishAbout) {
      return { current: 'en', zh: (englishPost || englishAbout)[1], en: pathname };
    }
    if (chinesePost || chineseAbout) {
      return { current: 'zh', zh: pathname, en: '/en' + pathname };
    }
    return null;
  }

  function makeLink(label, href, active, language) {
    var element = document.createElement(active ? 'span' : 'a');
    element.className = 'bilingual-switch__option' + (active ? ' is-active' : '');
    element.textContent = label;
    element.setAttribute('lang', language);
    if (active) element.setAttribute('aria-current', 'page');
    else element.href = href + window.location.search + window.location.hash;
    return element;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var route = languageRoute(window.location.pathname);
    var article = document.querySelector('.post-content .markdown-body, main .markdown-body');
    if (!route || !article || document.querySelector('.bilingual-switch')) return;

    var nav = document.createElement('nav');
    nav.className = 'bilingual-switch';
    nav.setAttribute('aria-label', route.current === 'en' ? 'Language switch' : '语言切换');
    nav.appendChild(makeLink('中文', route.zh, route.current === 'zh', 'zh-CN'));

    var divider = document.createElement('span');
    divider.className = 'bilingual-switch__divider';
    divider.setAttribute('aria-hidden', 'true');
    divider.textContent = '/';
    nav.appendChild(divider);

    nav.appendChild(makeLink('English', route.en, route.current === 'en', 'en'));
    article.parentNode.insertBefore(nav, article);
  });
}());
