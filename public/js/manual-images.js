(function manualImagesSetup(globalObject) {
  function rewriteManualImageUrls(rootElement, rawParts, toManualProxyUrl) {
    if (!rootElement || typeof rootElement.querySelectorAll !== 'function') {
      return;
    }

    const resolveManualProxyUrl = typeof toManualProxyUrl === 'function'
      ? toManualProxyUrl
      : globalObject.manualUrl && globalObject.manualUrl.toManualProxyUrl;

    if (typeof resolveManualProxyUrl !== 'function') {
      return;
    }

    rootElement.querySelectorAll('img[src]').forEach((image) => {
      const source = image.getAttribute('src');
      image.setAttribute('src', resolveManualProxyUrl(source, rawParts));
    });
  }

  function getImageOpenUrl(image) {
    if (!image) {
      return '';
    }

    const attributeSource = typeof image.getAttribute === 'function' ? image.getAttribute('src') : '';
    return image.currentSrc || image.src || attributeSource || '';
  }

  globalObject.manualImages = {
    rewriteManualImageUrls,
    getImageOpenUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      rewriteManualImageUrls,
      getImageOpenUrl
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
