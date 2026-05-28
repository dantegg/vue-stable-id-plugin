const { normalizePluginOptions } = require('../../core/options');
const { transformVueSfcSource } = require('./transform-sfc-template');

function createViteVueStableIdPlugin(rawOptions = {}) {
  const pluginName =
    typeof rawOptions.pluginName === 'string' && rawOptions.pluginName
      ? rawOptions.pluginName
      : 'vite-vue-stable-id';
  const options = normalizePluginOptions(rawOptions);
  let projectRoot = process.cwd();

  return {
    name: pluginName,
    enforce: 'pre',

    configResolved(config) {
      if (config && typeof config.root === 'string' && config.root) {
        projectRoot = config.root;
      }
    },

    transform(code, id) {
      const resourcePath = stripViteQuery(id);
      if (!resourcePath.endsWith('.vue')) {
        return null;
      }

      return transformVueSfcSource({
        code,
        resourcePath,
        contextRoot: projectRoot,
        options
      });
    }
  };
}

function stripViteQuery(id) {
  const queryIndex = id.indexOf('?');
  return queryIndex >= 0 ? id.slice(0, queryIndex) : id;
}

module.exports = {
  createViteVueStableIdPlugin,
  stripViteQuery
};
