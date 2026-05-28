const { injectVueLoaderModules } = require('./adapters/webpack-vue2/inject-vue-loader-modules');
const { normalizePluginOptions } = require('./core/options');

const PLUGIN_NAME = 'VueStableIdPlugin';
const VITE_PLUGIN_NAME = 'vite-vue-stable-id';

class VueStableIdPlugin {
  constructor(options = {}) {
    this.options = normalizePluginOptions(options);
  }

  apply(compiler) {
    injectVueLoaderModules({
      compiler,
      options: this.options,
      pluginName: PLUGIN_NAME
    });
  }
}

module.exports = VueStableIdPlugin;
module.exports.VueStableIdPlugin = VueStableIdPlugin;
module.exports.createViteVueStableIdPlugin = function createViteVueStableIdPlugin(options = {}) {
  const { createViteVueStableIdPlugin } = require('./adapters/vite-vue3');
  return createViteVueStableIdPlugin({
    ...options,
    pluginName: VITE_PLUGIN_NAME
  });
};
