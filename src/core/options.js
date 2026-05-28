const DEFAULT_PREFIX = 'vsi-';
const DEFAULT_STRATEGY = 'path-position';
const SUPPORTED_STRATEGIES = new Set(['path-position', 'content', 'hybrid']);

function normalizePluginOptions(rawOptions = {}) {
  if (!rawOptions || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    throw new TypeError('VueStableIdPlugin options must be an object.');
  }

  const strategy = rawOptions.strategy || DEFAULT_STRATEGY;
  if (!SUPPORTED_STRATEGIES.has(strategy)) {
    throw new Error(
      `Unsupported strategy "${strategy}". Expected one of: ${Array.from(SUPPORTED_STRATEGIES).join(', ')}.`
    );
  }

  const prefix =
    typeof rawOptions.prefix === 'string' ? rawOptions.prefix : DEFAULT_PREFIX;
  const logger =
    typeof rawOptions.logger === 'function' ? rawOptions.logger : console.log;

  return {
    prefix,
    strategy,
    include: rawOptions.include || null,
    exclude: rawOptions.exclude || null,
    respectExistingId: rawOptions.respectExistingId !== false,
    debug: Boolean(rawOptions.debug),
    logger
  };
}

module.exports = {
  DEFAULT_PREFIX,
  DEFAULT_STRATEGY,
  SUPPORTED_STRATEGIES,
  normalizePluginOptions
};
