(function () {
  'use strict';

  if (!/^\/?(?:index\.html)?$/.test(window.location.pathname)) return;

  var dashboardData = null;

  function isEnglish() {
    return document.documentElement.getAttribute('data-site-language') === 'en';
  }

  function text(chinese, english) {
    return isEnglish() ? english : chinese;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function localDateKey(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function compactNumber(value) {
    var number = Number(value || 0);
    if (isEnglish()) {
      if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (number >= 1000) return (number / 1000).toFixed(number >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'K';
      return number.toLocaleString('en-US');
    }
    if (number >= 10000) return (number / 10000).toFixed(number >= 100000 ? 0 : 1) + '万';
    return number.toLocaleString('zh-CN');
  }

  function buildNowCard(now) {
    var items = Array.isArray(now && now.items) ? now.items : [];
    var rows = items.map(function (item) {
      return '<li class="zhw-now-item">' +
        '<div class="zhw-now-meta"><span>' + escapeHtml(item.label) + '</span>' +
        '<b>' + escapeHtml(item.status) + '</b></div>' +
        '<h4>' + escapeHtml(item.title) + '</h4>' +
        '<p>' + escapeHtml(item.detail) + '</p>' +
      '</li>';
    }).join('');

    return '<article class="zhw-card zhw-now-card">' +
      '<div class="zhw-card-heading"><span class="zhw-eyebrow">' + text('NOW / 最近施工', 'NOW / CURRENT WORK') + '</span>' +
      '<time>' + escapeHtml(now && now.updated) + '</time></div>' +
      '<ul class="zhw-now-list">' + rows + '</ul>' +
    '</article>';
  }

  function buildRandomCard(postCount) {
    return '<article class="zhw-card zhw-random-card">' +
      '<span class="zhw-eyebrow">RANDOM WALK</span>' +
      '<h3>' + text('随便看看', 'Random Reading') + '</h3>' +
      '<p>' + (isEnglish()
        ? 'Pick at random from ' + escapeHtml(postCount) + ' translated posts: perhaps a brief reflection, perhaps a complete tutorial.'
        : '从 ' + escapeHtml(postCount) + ' 篇文章中随机抽一张，可能是一份碎碎念，也有可能是一份完整教程。') + '</p>' +
      '<button type="button" id="zhw-random-post">' + text('抽一篇旧文章', 'Pick an Older Post') + ' <span aria-hidden="true">↗</span></button>' +
    '</article>';
  }

  function buildStatsCard(stats) {
    var entries = [
      [text('文章', 'Posts'), compactNumber(stats.postCount)],
      [text('约计字数', 'Approx. Words'), compactNumber(stats.totalWords)],
      [text('写作日', 'Writing Days'), compactNumber(stats.writingDays)],
      [text('标签', 'Tags'), compactNumber(stats.tagCount)]
    ];
    var cells = entries.map(function (entry) {
      return '<div><strong>' + escapeHtml(entry[1]) + '</strong><span>' + escapeHtml(entry[0]) + '</span></div>';
    }).join('');

    return '<article class="zhw-card zhw-stats-card">' +
      '<div class="zhw-card-heading"><div><span class="zhw-eyebrow">SITE DATA</span><h3>' + text('全站数据', 'Site Statistics') + '</h3></div>' +
      '<small>' + (isEnglish() ? 'Since ' : '') + escapeHtml(stats.firstPostDate) + (isEnglish() ? '' : ' 起') + '</small></div>' +
      '<div class="zhw-stats-grid">' + cells + '</div>' +
    '</article>';
  }

  function buildHeatmap(heatmap) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    var start = new Date(end);
    start.setDate(start.getDate() - 370);
    var cells = [];
    var activeDays = 0;
    var postTotal = 0;

    for (var index = 0; index < 371; index += 1) {
      var day = new Date(start);
      day.setDate(start.getDate() + index);
      var key = localDateKey(day);
      var count = day > today ? 0 : Number(heatmap[key] || 0);
      var level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4;
      if (count > 0) activeDays += 1;
      postTotal += count;
      cells.push('<span class="zhw-heat-cell level-' + level + '" title="' + key + ' · ' + count + text(' 篇', ' posts') + '" aria-label="' + key + text('，', ', ') + count + text(' 篇', ' posts') + '"></span>');
    }

    return '<article class="zhw-card zhw-heatmap-card">' +
      '<div class="zhw-card-heading"><div><span class="zhw-eyebrow">WRITING TRACE</span><h3>' + text('过去一年的写作热力图', 'Writing Activity over the Past Year') + '</h3></div>' +
      '<small>' + (isEnglish() ? activeDays + ' days · ' + postTotal + ' posts' : activeDays + ' 天写下 ' + postTotal + ' 篇') + '</small></div>' +
      '<div class="zhw-heatmap-scroll"><div class="zhw-heatmap" role="img" aria-label="' + text('过去一年写作热力图', 'Writing activity over the past year') + '">' + cells.join('') + '</div></div>' +
      '<div class="zhw-heat-legend"><span>' + text('少', 'Less') + '</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>' + text('多', 'More') + '</span></div>' +
    '</article>';
  }

  function buildMusicCard(netease, generatedAt) {
    var songs = Array.isArray(netease && netease.songs) ? netease.songs : [];
    var content;

    if (songs.length) {
      content = '<ol class="zhw-music-list">' + songs.map(function (song, index) {
        var cover = song.cover
          ? '<img src="' + escapeHtml(song.cover) + '?param=96y96" alt="" loading="lazy">'
          : '<span class="zhw-music-placeholder">♪</span>';
        return '<li><a href="' + escapeHtml(song.url) + '" target="_blank" rel="noopener noreferrer">' +
          cover + '<span class="zhw-track-index">0' + (index + 1) + '</span><span class="zhw-track-copy">' +
          '<strong>' + escapeHtml(song.name) + '</strong><small>' + escapeHtml(song.artist) + '</small>' +
          '</span><span class="zhw-track-arrow" aria-hidden="true">↗</span></a></li>';
      }).join('') + '</ol>';
    } else {
      content = '<p class="zhw-music-empty">' + text('本次构建没有取到公开听歌记录，先去网易云主页看看。', 'No public listening history was available during this build; visit the NetEase profile instead.') + '</p>';
    }

    var refreshed = generatedAt ? new Date(generatedAt).toLocaleDateString(isEnglish() ? 'en-CA' : 'zh-CN') : '';
    return '<article class="zhw-card zhw-music-card">' +
      '<div class="zhw-card-heading"><div><span class="zhw-eyebrow">NETEASE CLOUD MUSIC</span><h3>' + text('最近一周常听', 'Most Played This Week') + '</h3></div>' +
      '<a href="' + escapeHtml(netease.profileUrl) + '" target="_blank" rel="noopener noreferrer">' + text('主页 ↗', 'Profile ↗') + '</a></div>' +
      content + '<p class="zhw-music-note">' + (isEnglish() ? 'Public listening chart · built on ' : '公开听歌排行 · 构建于 ') + escapeHtml(refreshed) + '</p>' +
    '</article>';
  }

  function mountDashboard(data) {
    dashboardData = data;
    var target = document.querySelector('#board .col-12.col-md-10.m-auto');
    if (!target) return;
    var board = document.getElementById('board');
    var pageShell = board && board.parentElement;
    if (!board || !pageShell) return;

    var wrapper = document.querySelector('.zhw-dashboard');
    if (!wrapper) {
      wrapper = document.createElement('section');
      wrapper.className = 'zhw-dashboard col-12 col-md-10 m-auto';
      pageShell.insertBefore(wrapper, board);
    }
    wrapper.setAttribute('aria-label', text('博客概览', 'Blog overview'));
    wrapper.innerHTML =
      '<header class="zhw-dashboard-header"><div><span class="zhw-eyebrow">SITE PULSE</span><h2>' + text('博客现在还活着', 'The Blog Is Still Alive') + '</h2></div>' +
      '<a class="zhw-tag-entry" href="/tags/"><span aria-hidden="true">#</span> ' + text('标签云', 'Tag Cloud') + '</a></header>' +
      '<div class="zhw-primary-grid">' + buildNowCard(isEnglish() ? (data.nowEn || data.now || {}) : (data.now || {})) +
      '<div class="zhw-side-stack">' + buildRandomCard((data.posts || []).length) + buildStatsCard(data.stats || {}) + '</div></div>' +
      '<div class="zhw-secondary-grid">' + buildHeatmap(data.heatmap || {}) + buildMusicCard(data.netease || {}, data.generatedAt) + '</div>';

    board.classList.add('zhw-dashboard-mounted');
    pageShell.classList.add('zhw-page-shell');

    var heatmapScroll = wrapper.querySelector('.zhw-heatmap-scroll');
    if (heatmapScroll) {
      var showLatestWriting = function () {
        heatmapScroll.scrollLeft = heatmapScroll.scrollWidth;
      };
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(showLatestWriting);
      });
      window.setTimeout(showLatestWriting, 250);
    }

    var randomButton = document.getElementById('zhw-random-post');
    if (randomButton) {
      randomButton.addEventListener('click', function () {
        var posts = Array.isArray(data.posts) ? data.posts : [];
        if (!posts.length) return;
        var picked = posts[Math.floor(Math.random() * posts.length)];
        var language = window.ZHWSiteLanguage;
        window.location.href = language ? language.routeFor(picked.url, language.current()) : picked.url;
      });
    }

    document.dispatchEvent(new CustomEvent('zhw:dashboardrendered'));
  }

  function init() {
    fetch('/data/site-dashboard.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(mountDashboard)
      .catch(function (error) {
        console.warn('[blog-dashboard] data unavailable:', error.message);
      });
  }

  document.addEventListener('zhw:languageapplied', function () {
    if (dashboardData) mountDashboard(dashboardData);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
