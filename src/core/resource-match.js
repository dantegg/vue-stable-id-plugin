function shouldProcessResource(resourcePath, options) {
  if (!resourcePath) {
    return true;
  }

  if (matchesPattern(options.exclude, resourcePath)) {
    return false;
  }

  if (!options.include) {
    return true;
  }

  return matchesPattern(options.include, resourcePath);
}

function matchesPattern(pattern, resourcePath) {
  if (!pattern) {
    return false;
  }

  if (Array.isArray(pattern)) {
    return pattern.some((entry) => matchesPattern(entry, resourcePath));
  }

  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0;
    return pattern.test(resourcePath);
  }

  if (typeof pattern === 'function') {
    return Boolean(pattern(resourcePath));
  }

  if (typeof pattern === 'string') {
    return resourcePath.includes(pattern);
  }

  return false;
}

module.exports = {
  matchesPattern,
  shouldProcessResource
};
