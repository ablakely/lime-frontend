(function pageSearchSetup(globalObject) {
  function normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchesSearchQuery(value, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return true;
    }

    return normalizeSearchText(value).includes(normalizedQuery);
  }

  function filterGroupedItems(items, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return items.map(() => true);
    }

    const visibility = items.map(() => false);
    let currentHeaderIndex = -1;
    let sectionHasVisibleItems = false;

    function commitHeaderVisibility() {
      if (currentHeaderIndex >= 0) {
        visibility[currentHeaderIndex] = sectionHasVisibleItems;
      }
    }

    items.forEach((item, index) => {
      if (item.kind === 'header') {
        commitHeaderVisibility();
        currentHeaderIndex = index;
        sectionHasVisibleItems = false;
        return;
      }

      const isVisible = matchesSearchQuery(item.text, normalizedQuery);
      visibility[index] = isVisible;

      if (currentHeaderIndex >= 0 && isVisible) {
        sectionHasVisibleItems = true;
      }
    });

    commitHeaderVisibility();
    return visibility;
  }

  globalObject.pageSearch = {
    normalizeSearchText,
    matchesSearchQuery,
    filterGroupedItems
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      normalizeSearchText,
      matchesSearchQuery,
      filterGroupedItems
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
