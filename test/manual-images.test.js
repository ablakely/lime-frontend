const test = require('node:test');
const assert = require('node:assert/strict');
const { rewriteManualImageUrls, getImageOpenUrl } = require('../public/js/manual-images.js');

test('rewriteManualImageUrls rewrites every manual image source', () => {
  const images = [
    {
      attributes: { src: 'diagram.png' },
      getAttribute(name) {
        return this.attributes[name];
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    {
      attributes: { src: 'images25/VA145687/example.png' },
      getAttribute(name) {
        return this.attributes[name];
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    }
  ];

  rewriteManualImageUrls({
    querySelectorAll(selector) {
      assert.equal(selector, 'img[src]');
      return images;
    }
  }, ['Chevrolet', '2001', 'Astro%20Van%20Cargo%2C%20RWD', 'Labor%20Times'], (value) => `/api/manual/${value}`);

  assert.equal(images[0].attributes.src, '/api/manual/diagram.png');
  assert.equal(images[1].attributes.src, '/api/manual/images25/VA145687/example.png');
});

test('getImageOpenUrl prefers the current resolved image source', () => {
  assert.equal(getImageOpenUrl({
    currentSrc: '/api/manual/current.png',
    src: '/api/manual/fallback.png',
    getAttribute() {
      return '/api/manual/attribute.png';
    }
  }), '/api/manual/current.png');
});
