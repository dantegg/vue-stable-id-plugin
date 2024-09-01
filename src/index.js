const crypto = require('crypto');

class VueStableIdPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('VueStableIdPlugin', (compilation) => {
      const vueLoader = compilation.options.module.rules.find(rule => rule.loader && rule.loader.includes('vue-loader'));
      
      if (vueLoader && vueLoader.options && vueLoader.options.compilerOptions) {
        const originalModules = vueLoader.options.compilerOptions.modules || [];
        vueLoader.options.compilerOptions.modules = [
          {
            preTransformNode(astEl) {
              if (astEl.tag && !astEl.attrsMap.id) {
                const hash = crypto.createHash('md5')
                  .update(astEl.tag + JSON.stringify(astEl.attrsMap))
                  .digest('hex');
                
                const id = `id-${hash}`;
                astEl.attrsList.push({ name: 'id', value: id });
                astEl.attrsMap.id = id;
              }
              return astEl;
            }
          },
          ...originalModules
        ];
      }
    });
  }
}

module.exports = VueStableIdPlugin;
