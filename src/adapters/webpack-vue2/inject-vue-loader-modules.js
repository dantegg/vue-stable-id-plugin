const {
  MODULE_MARKER,
  createVueStableIdCompilerModule
} = require('./compiler-module');

function injectVueLoaderModules({ compiler, options, pluginName }) {
  const rules =
    compiler &&
    compiler.options &&
    compiler.options.module &&
    Array.isArray(compiler.options.module.rules)
      ? compiler.options.module.rules
      : [];

  if (rules.length === 0) {
    debugLog(options, pluginName, 'webpack rules are empty; skipped vue-loader injection.');
    return { injectedCount: 0 };
  }

  let injectedCount = 0;
  visitRules(rules, (useEntry) => {
    const compilerOptions = ensureCompilerOptions(useEntry);
    const existingModules = Array.isArray(compilerOptions.modules)
      ? compilerOptions.modules
      : [];

    if (existingModules.some(isStableIdCompilerModule)) {
      return;
    }

    const compilerModule = createVueStableIdCompilerModule({
      options,
      contextRoot: compiler.context || process.cwd(),
      pluginName
    });

    compilerOptions.modules = [compilerModule, ...existingModules];
    injectedCount += 1;
  });

  if (injectedCount === 0) {
    debugLog(options, pluginName, 'no vue-loader rule matched in webpack configuration.');
  }

  return { injectedCount };
}

function visitRules(rules, visitor) {
  for (const rule of rules) {
    visitRule(rule, visitor);
  }
}

function visitRule(rule, visitor) {
  if (!rule || typeof rule !== 'object') {
    return;
  }

  if (matchesVueLoader(rule.loader)) {
    if (!rule.options || typeof rule.options !== 'object') {
      rule.options = {};
    }
    visitor(rule);
  }

  if (rule.use) {
    rule.use = normalizeUseContainer(rule.use);
    const entries = Array.isArray(rule.use) ? rule.use : [rule.use];

    for (const entry of entries) {
      if (entry && matchesVueLoader(entry.loader)) {
        visitor(entry);
      }
    }
  }

  if (Array.isArray(rule.oneOf)) {
    visitRules(rule.oneOf, visitor);
  }

  if (Array.isArray(rule.rules)) {
    visitRules(rule.rules, visitor);
  }
}

function normalizeUseContainer(use) {
  if (Array.isArray(use)) {
    return use.map((entry) => normalizeUseEntry(entry));
  }

  return normalizeUseEntry(use);
}

function normalizeUseEntry(entry) {
  if (typeof entry === 'string') {
    return {
      loader: entry,
      options: {}
    };
  }

  if (!entry || typeof entry !== 'object') {
    return {
      loader: '',
      options: {}
    };
  }

  if (!entry.options || typeof entry.options !== 'object') {
    entry.options = {};
  }

  return entry;
}

function ensureCompilerOptions(useEntry) {
  if (!useEntry.options || typeof useEntry.options !== 'object') {
    useEntry.options = {};
  }

  if (!useEntry.options.compilerOptions || typeof useEntry.options.compilerOptions !== 'object') {
    useEntry.options.compilerOptions = {};
  }

  return useEntry.options.compilerOptions;
}

function matchesVueLoader(loader) {
  return typeof loader === 'string' && loader.includes('vue-loader');
}

function isStableIdCompilerModule(moduleEntry) {
  return Boolean(moduleEntry && moduleEntry[MODULE_MARKER]);
}

function debugLog(options, pluginName, message) {
  if (options.debug) {
    options.logger(`[${pluginName}] ${message}`);
  }
}

module.exports = {
  ensureCompilerOptions,
  injectVueLoaderModules,
  isStableIdCompilerModule,
  matchesVueLoader,
  normalizeUseEntry
};
