(function () {
  'use strict';

  if (!/^\/?(?:index\.html)?$/.test(window.location.pathname)) return;

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
      '<div class="zhw-card-heading"><span class="zhw-eyebrow">NOW / 最近施工</span>' +
      '<time>' + escapeHtml(now && now.updated) + '</time></div>' +
      '<ul class="zhw-now-list">' + rows + '</ul>' +
    '</article>';
  }

  function buildRandomCard(postCount) {
    return '<article class="zhw-card zhw-random-card">' +
      '<span class="zhw-eyebrow">RANDOM WALK</span>' +
      '<h3>随便看看</h3>' +
      '<p>从 ' + escapeHtml(postCount) + ' 篇文章中随机抽一张，可能是一份碎碎念，也有可能是一份完整教程。</p>' +
      '<button type="button" id="zhw-random-post">抽一篇旧文章 <span aria-hidden="true">↗</span></button>' +
    '</article>';
  }

  function buildStatsCard(stats) {
    var entries = [
      ['文章', compactNumber(stats.postCount)],
      ['约计字数', compactNumber(stats.totalWords)],
      ['写作日', compactNumber(stats.writingDays)],
      ['标签', compactNumber(stats.tagCount)]
    ];
    var cells = entries.map(function (entry) {
      return '<div><strong>' + escapeHtml(entry[1]) + '</strong><span>' + escapeHtml(entry[0]) + '</span></div>';
    }).join('');

    return '<article class="zhw-card zhw-stats-card">' +
      '<div class="zhw-card-heading"><div><span class="zhw-eyebrow">SITE DATA</span><h3>全站数据</h3></div>' +
      '<small>' + escapeHtml(stats.firstPostDate) + ' 起</small></div>' +
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
      cells.push('<span class="zhw-heat-cell level-' + level + '" title="' + key + ' · ' + count + ' 篇" aria-label="' + key + '，' + count + ' 篇"></span>');
    }

    return '<article class="zhw-card zhw-heatmap-card">' +
      '<div class="zhw-card-heading"><div><span class="zhw-eyebrow">WRITING TRACE</span><h3>过去一年的写作热力图</h3></div>' +
      '<small>' + activeDays + ' 天写下 ' + postTotal + ' 篇</small></div>' +
      '<div class="zhw-heatmap-scroll"><div class="zhw-heatmap" role="img" aria-label="过去一年写作热力图">' + cells.join('') + '</div></div>' +
      '<div class="zhw-heat-legend"><span>少</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>多</span></div>' +
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
      content = '<p class="zhw-music-empty">本次构建没有取到公开听歌记录，先去网易云主页看看。</p>';
    }

    var refreshed = generatedAt ? new Date(generatedAt).toLocaleDateString('zh-CN') : '';
    return '<article class="zhw-card zhw-music-card">' +
      '<div class="zhw-card-heading"><div><span class="zhw-eyebrow">NETEASE CLOUD MUSIC</span><h3>最近一周常听</h3></div>' +
      '<a href="' + escapeHtml(netease.profileUrl) + '" target="_blank" rel="noopener noreferrer">主页 ↗</a></div>' +
      content + '<p class="zhw-music-note">公开听歌排行 · 构建于 ' + escapeHtml(refreshed) + '</p>' +
    '</article>';
  }

  function mountDashboard(data) {
    if (window.__zhwDashboardMounted) return;
    var target = document.querySelector('#board .col-12.col-md-10.m-auto');
    if (!target) return;
    var board = document.getElementById('board');
    var pageShell = board && board.parentElement;
    if (!board || !pageShell) return;

    window.__zhwDashboardMounted = true;
    var wrapper = document.createElement('section');
    wrapper.className = 'zhw-dashboard col-12 col-md-10 m-auto';
    wrapper.setAttribute('aria-label', '博客概览');
    wrapper.innerHTML =
      '<header class="zhw-dashboard-header"><div><span class="zhw-eyebrow">SITE PULSE</span><h2>博客现在还活着</h2></div>' +
      '<a class="zhw-tag-entry" href="/tags/"><span aria-hidden="true">#</span> 标签云</a></header>' +
      '<div class="zhw-primary-grid">' + buildNowCard(data.now || {}) +
      '<div class="zhw-side-stack">' + buildRandomCard((data.posts || []).length) + buildStatsCard(data.stats || {}) + '</div></div>' +
      '<div class="zhw-secondary-grid">' + buildHeatmap(data.heatmap || {}) + buildMusicCard(data.netease || {}, data.generatedAt) + '</div>';

    board.classList.add('zhw-dashboard-mounted');
    pageShell.classList.add('zhw-page-shell');
    pageShell.insertBefore(wrapper, board);

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
        window.location.href = picked.url;
      });
    }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
