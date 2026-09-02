(function () {
  'use strict';

  if (!/^\/tags\/?(?:index\.html)?$/.test(window.location.pathname)) return;

  var cloudData = null;
  var resizeTimer = null;

  function currentLanguage() {
    return document.documentElement.getAttribute('data-site-language') === 'en' ? 'en' : 'zh';
  }

  function fontSize(count, maximum) {
    if (maximum <= 0) return 14;
    return 14 + 20 * Math.log(1 + count) / Math.log(1 + maximum);
  }

  function stableHash(value) {
    var hash = 2166136261;
    for (var index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function overlaps(candidate, boxes) {
    return boxes.some(function (box) {
      return !(candidate.right < box.left || candidate.left > box.right || candidate.bottom < box.top || candidate.top > box.bottom);
    });
  }

  function attemptLayout(items, width, height) {
    var boxes = [];
    var positions = [];

    for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      var item = items[itemIndex];
      var placed = false;
      var startAngle = (stableHash(item.name) % 628) / 100;

      for (var step = 0; step < 9000; step += 1) {
        var angle = startAngle + step * 0.31;
        var radius = 2.15 * angle;
        var x = width / 2 + Math.cos(angle) * radius * 1.12;
        var y = height / 2 + Math.sin(angle) * radius;
        var halfWidth = item.width / 2 + 5;
        var halfHeight = item.height / 2 + 4;
        var candidate = {
          left: x - halfWidth,
          right: x + halfWidth,
          top: y - halfHeight,
          bottom: y + halfHeight
        };

        if (candidate.left < 8 || candidate.right > width - 8 || candidate.top < 8 || candidate.bottom > height - 8) continue;
        if (overlaps(candidate, boxes)) continue;
        boxes.push(candidate);
        positions.push({ x: x, y: y });
        placed = true;
        break;
      }

      if (!placed) return null;
    }

    return positions;
  }

  function layoutPlane(plane, items) {
    var width = Math.max(260, plane.clientWidth);
    var measuredArea = items.reduce(function (sum, item) { return sum + item.width * item.height; }, 0);
    var height = Math.max(420, Math.ceil(measuredArea / width * 1.75));
    var positions = null;

    while (!positions && height <= 1800) {
      positions = attemptLayout(items, width, height);
      if (!positions) height += 120;
    }

    if (!positions) {
      height = Math.max(height, 1800);
      positions = items.map(function (_, index) {
        return { x: width / 2, y: 24 + index * 42 };
      });
      height = Math.max(height, 48 + items.length * 42);
    }

    plane.style.height = height + 'px';
    items.forEach(function (item, index) {
      item.element.style.left = positions[index].x + 'px';
      item.element.style.top = positions[index].y + 'px';
      item.element.style.visibility = 'visible';
    });
  }

  function renderCloud() {
    if (!cloudData) return;
    var container = document.querySelector('.tagcloud');
    if (!container) return;
    var language = currentLanguage();
    var tags = Array.isArray(cloudData[language]) ? cloudData[language] : [];
    var maximum = tags.reduce(function (value, tag) { return Math.max(value, Number(tag.count || 0)); }, 0);

    container.classList.add('zhw-wordcloud');
    container.innerHTML = '';

    var summary = document.createElement('p');
    summary.className = 'zhw-wordcloud__summary';
    summary.textContent = language === 'en'
      ? tags.length + ' tags · font size represents the number of articles'
      : tags.length + ' 个标签 · 字号表示包含该标签的文章数';
    container.appendChild(summary);

    var plane = document.createElement('div');
    plane.className = 'zhw-wordcloud__plane';
    plane.setAttribute('aria-label', language === 'en' ? 'English tag cloud' : '中文标签云');
    container.appendChild(plane);

    var items = tags.map(function (tag) {
      var count = Number(tag.count || 0);
      var size = fontSize(count, maximum);
      var anchor = document.createElement('a');
      anchor.href = tag.url;
      anchor.textContent = tag.name;
      anchor.title = language === 'en' ? count + ' articles' : count + ' 篇文章';
      anchor.style.fontSize = size.toFixed(2) + 'px';
      anchor.style.opacity = String(0.64 + 0.36 * (size - 14) / 20);
      anchor.style.visibility = 'hidden';
      plane.appendChild(anchor);
      return { name: tag.name, element: anchor, width: anchor.offsetWidth, height: anchor.offsetHeight };
    });

    window.requestAnimationFrame(function () { layoutPlane(plane, items); });
  }

  function init() {
    fetch('/data/tag-cloud.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        cloudData = data;
        renderCloud();
      })
      .catch(function (error) {
        console.warn('[tag-cloud] data unavailable:', error.message);
      });
  }

  document.addEventListener('zhw:languageapplied', renderCloud);
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderCloud, 160);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
