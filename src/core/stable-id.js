const crypto = require('crypto');
const path = require('path');

function createStableId({
  prefix,
  strategy,
  resourcePath,
  contextRoot,
  nodePath,
  astEl
}) {
  const token = buildStableToken({
    strategy,
    resourcePath,
    contextRoot,
    nodePath,
    astEl
  });

  return `${prefix}${hashToken(token)}`;
}

function buildStableToken({
  strategy,
  resourcePath,
  contextRoot,
  nodePath,
  astEl
}) {
  const normalizedPath = normalizeResourcePath(resourcePath, contextRoot);
  const elementSignature = createElementSignature(astEl);

  switch (strategy) {
    case 'content':
      return `content::${elementSignature}`;
    case 'hybrid':
      return `${normalizedPath}::${nodePath}::${elementSignature}`;
    case 'path-position':
    default:
      return resourcePath
        ? `${normalizedPath}::${nodePath}::${astEl && astEl.tag ? astEl.tag : 'unknown-tag'}`
        : `${normalizedPath}::${nodePath}::${elementSignature}`;
  }
}

function createElementSignature(astEl) {
  const tag = astEl && astEl.tag ? astEl.tag : 'unknown-tag';
  const attrsList = Array.isArray(astEl && astEl.attrsList) ? astEl.attrsList : [];
  const attrs = attrsList
    .filter((attr) => attr && attr.name && attr.name !== 'id')
    .map((attr) => `${attr.name}=${attr.value == null ? '' : String(attr.value)}`)
    .sort();

  return `${tag}::${attrs.join('|')}`;
}

function normalizeResourcePath(resourcePath, contextRoot) {
  if (!resourcePath) {
    return 'unknown-resource';
  }

  const candidateRoot = typeof contextRoot === 'string' ? contextRoot : '';
  const relativePath = candidateRoot ? path.relative(candidateRoot, resourcePath) : resourcePath;
  const preferredPath =
    relativePath &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
      ? relativePath
      : resourcePath;

  return preferredPath.replace(/\\/g, '/');
}

function hashToken(token) {
  return crypto.createHash('sha1').update(token).digest('hex').slice(0, 12);
}

module.exports = {
  createElementSignature,
  createStableId,
  normalizeResourcePath
};
