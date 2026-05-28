const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VueStableIdPlugin = require('../src');
const { createVueStableIdCompilerModule } = require('../src/adapters/webpack-vue2/compiler-module');
const { injectVueLoaderModules } = require('../src/adapters/webpack-vue2/inject-vue-loader-modules');
const { transformVueSfcSource } = require('../src/adapters/vite-vue3/transform-sfc-template');
const { normalizePluginOptions } = require('../src/core/options');
const { createStableId } = require('../src/core/stable-id');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`PASS ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(error.stack || error.message || error);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`);
}

function createAst(tag, attrs = {}, children = []) {
  return {
    tag,
    attrsList: Object.keys(attrs).map((name) => ({ name, value: attrs[name] })),
    attrsMap: { ...attrs },
    rawAttrsMap: Object.keys(attrs).reduce((result, name) => {
      result[name] = { name, value: attrs[name] };
      return result;
    }, {}),
    children
  };
}

function walkModule(moduleEntry, node, filename) {
  moduleEntry.preTransformNode(node, { filename });
  for (const child of node.children || []) {
    walkModule(moduleEntry, child, filename);
  }
  moduleEntry.postTransformNode(node, { filename });
}

test('path-position strategy ignores non-structural attribute changes', () => {
  const first = createStableId({
    prefix: 'vsi-',
    strategy: 'path-position',
    resourcePath: '/repo/src/App.vue',
    contextRoot: '/repo',
    nodePath: '0.1',
    astEl: createAst('button', { class: 'primary' })
  });

  const second = createStableId({
    prefix: 'vsi-',
    strategy: 'path-position',
    resourcePath: '/repo/src/App.vue',
    contextRoot: '/repo',
    nodePath: '0.1',
    astEl: createAst('button', { class: 'secondary', 'data-state': 'active' })
  });

  assert.strictEqual(first, second);
});

test('content strategy changes when attributes change', () => {
  const first = createStableId({
    prefix: 'vsi-',
    strategy: 'content',
    resourcePath: '/repo/src/App.vue',
    contextRoot: '/repo',
    nodePath: '0.1',
    astEl: createAst('button', { class: 'primary' })
  });

  const second = createStableId({
    prefix: 'vsi-',
    strategy: 'content',
    resourcePath: '/repo/src/App.vue',
    contextRoot: '/repo',
    nodePath: '0.1',
    astEl: createAst('button', { class: 'secondary' })
  });

  assert.notStrictEqual(first, second);
});

test('compiler module injects stable ids by node position', () => {
  const moduleEntry = createVueStableIdCompilerModule({
    options: normalizePluginOptions(),
    contextRoot: '/repo',
    pluginName: 'TestPlugin'
  });

  const firstTree = createAst('div', {}, [
    createAst('span', { class: 'a' }),
    createAst('span', { class: 'b' })
  ]);

  walkModule(moduleEntry, firstTree, '/repo/src/App.vue');
  const firstIds = [
    firstTree.attrsMap.id,
    firstTree.children[0].attrsMap.id,
    firstTree.children[1].attrsMap.id
  ];

  const secondTree = createAst('div', {}, [
    createAst('span', { class: 'changed-a' }),
    createAst('span', { class: 'changed-b', 'data-state': 'x' })
  ]);

  walkModule(moduleEntry, secondTree, '/repo/src/App.vue');
  const secondIds = [
    secondTree.attrsMap.id,
    secondTree.children[0].attrsMap.id,
    secondTree.children[1].attrsMap.id
  ];

  assert.deepStrictEqual(firstIds, secondIds);
  assert.notStrictEqual(secondIds[1], secondIds[2]);
});

test('compiler module respects existing ids by default', () => {
  const moduleEntry = createVueStableIdCompilerModule({
    options: normalizePluginOptions(),
    contextRoot: '/repo',
    pluginName: 'TestPlugin'
  });

  const tree = createAst('div', { id: 'manual-id' });
  walkModule(moduleEntry, tree, '/repo/src/Manual.vue');

  assert.strictEqual(tree.attrsMap.id, 'manual-id');
});

test('compiler module can exclude matching resources', () => {
  const moduleEntry = createVueStableIdCompilerModule({
    options: normalizePluginOptions({
      exclude: /legacy/
    }),
    contextRoot: '/repo',
    pluginName: 'TestPlugin'
  });

  const tree = createAst('div');
  walkModule(moduleEntry, tree, '/repo/src/legacy/OldPage.vue');

  assert.strictEqual(tree.attrsMap.id, undefined);
});

test('injectVueLoaderModules handles nested oneOf/use rules and avoids duplicates', () => {
  const compiler = {
    context: '/repo',
    options: {
      module: {
        rules: [
          {
            oneOf: [
              {
                use: ['cache-loader', 'vue-loader']
              }
            ]
          }
        ]
      }
    }
  };

  const options = normalizePluginOptions();
  const first = injectVueLoaderModules({
    compiler,
    options,
    pluginName: 'TestPlugin'
  });
  const second = injectVueLoaderModules({
    compiler,
    options,
    pluginName: 'TestPlugin'
  });

  const vueLoaderUse = compiler.options.module.rules[0].oneOf[0].use[1];
  const modules = vueLoaderUse.options.compilerOptions.modules;

  assert.strictEqual(first.injectedCount, 1);
  assert.strictEqual(second.injectedCount, 0);
  assert.strictEqual(Array.isArray(modules), true);
  assert.strictEqual(modules.length, 1);
});

test('plugin apply injects compiler module into direct vue-loader rules', () => {
  const compiler = {
    context: path.join('/repo'),
    options: {
      module: {
        rules: [
          {
            loader: 'vue-loader',
            options: {}
          }
        ]
      }
    }
  };

  const plugin = new VueStableIdPlugin();
  plugin.apply(compiler);

  const modules = compiler.options.module.rules[0].options.compilerOptions.modules;
  assert.strictEqual(Array.isArray(modules), true);
  assert.strictEqual(modules.length, 1);
  assert.strictEqual(typeof modules[0].preTransformNode, 'function');
});

test('vite transform injects ids and preserves stability across non-structural attribute changes', () => {
  const options = normalizePluginOptions();
  const first = transformVueSfcSource({
    code: `<template><section><button class="primary">One</button><button data-state="ready">Two</button></section></template>`,
    resourcePath: '/repo/src/App.vue',
    contextRoot: '/repo',
    options
  });
  const second = transformVueSfcSource({
    code: `<template><section><button class="secondary" data-tone="strong">One</button><button data-state="done">Two</button></section></template>`,
    resourcePath: '/repo/src/App.vue',
    contextRoot: '/repo',
    options
  });

  const firstIds = extractStableIds(first.code);
  const secondIds = extractStableIds(second.code);

  assert.deepStrictEqual(firstIds, secondIds);
});

test('vite transform skips dynamic id bindings', () => {
  const result = transformVueSfcSource({
    code: `<template><div :id="computedId" class="box">Content</div></template>`,
    resourcePath: '/repo/src/BoundId.vue',
    contextRoot: '/repo',
    options: normalizePluginOptions()
  });

  assert.strictEqual(result, null);
});

test('webpack fixture build keeps ids stable across attribute-only changes', async () => {
  const webpack = require('webpack');
  const { VueLoaderPlugin } = require('vue-loader');
  const fixtureRoot = path.join(__dirname, 'fixtures', 'webpack-vue2');

  const baseBundle = await buildWebpackFixture({
    webpack,
    VueLoaderPlugin,
    fixtureRoot,
    fixtureName: 'base'
  });
  const variantBundle = await buildWebpackFixture({
    webpack,
    VueLoaderPlugin,
    fixtureRoot,
    fixtureName: 'variant'
  });

  const baseIds = extractStableIds(baseBundle);
  const variantIds = extractStableIds(variantBundle);

  assert.strictEqual(baseIds.length > 0, true);
  assert.deepStrictEqual(baseIds, variantIds);
});

async function buildWebpackFixture({ webpack, VueLoaderPlugin, fixtureRoot, fixtureName }) {
  const fixtureDir = path.join(fixtureRoot, fixtureName);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `vue-stable-id-${fixtureName}-`));
  const compiler = webpack({
    mode: 'development',
    target: 'node',
    devtool: false,
    context: fixtureDir,
    entry: './App.vue',
    output: {
      path: outputDir,
      filename: 'bundle.js',
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        }
      ]
    },
    plugins: [new VueLoaderPlugin(), new VueStableIdPlugin()]
  });

  const stats = await new Promise((resolve, reject) => {
    compiler.run((error, result) => {
      const finalize = () => {
        if (typeof compiler.close === 'function') {
          compiler.close(() => {});
        }
      };

      if (error) {
        finalize();
        reject(error);
        return;
      }

      if (!result || result.hasErrors()) {
        const details = result ? result.toString({ all: false, errors: true, errorDetails: true }) : 'Unknown webpack error';
        finalize();
        reject(new Error(details));
        return;
      }

      finalize();
      resolve(result);
    });
  });

  assert.strictEqual(stats.hasErrors(), false);
  return fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf8');
}

function extractStableIds(source) {
  const matches = source.match(/vsi-[a-f0-9]{12}/g) || [];
  return Array.from(new Set(matches)).sort();
}

run();
