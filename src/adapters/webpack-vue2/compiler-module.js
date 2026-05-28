const { shouldProcessResource } = require('../../core/resource-match');
const { createStableId } = require('../../core/stable-id');
const { inspectVue2IdState } = require('../../core/id-detection');

const MODULE_MARKER = '__vueStableIdCompilerModule';
const UNKNOWN_RESOURCE = 'unknown-resource';

function createVueStableIdCompilerModule({ options, contextRoot, pluginName }) {
  let activeTraversalState = null;

  function logDebug(message) {
    if (options.debug) {
      options.logger(`[${pluginName}] ${message}`);
    }
  }

  function ensureTraversalState(resourcePath) {
    const resourceKey = resourcePath || UNKNOWN_RESOURCE;

    if (
      !activeTraversalState ||
      activeTraversalState.resourceKey !== resourceKey ||
      activeTraversalState.stack.length === 0
    ) {
      activeTraversalState = {
        resourceKey,
        rootIndex: 0,
        stack: []
      };
    }

    return activeTraversalState;
  }

  function enterNode(resourcePath) {
    const traversalState = ensureTraversalState(resourcePath);
    const parentFrame = traversalState.stack[traversalState.stack.length - 1];
    const siblingIndex = parentFrame
      ? parentFrame.nextChildIndex++
      : traversalState.rootIndex++;
    const nodePath = parentFrame ? `${parentFrame.path}.${siblingIndex}` : `${siblingIndex}`;

    traversalState.stack.push({
      path: nodePath,
      nextChildIndex: 0
    });

    return nodePath;
  }

  function leaveNode() {
    if (activeTraversalState && activeTraversalState.stack.length > 0) {
      activeTraversalState.stack.pop();
    }
  }

  return {
    [MODULE_MARKER]: true,

    preTransformNode(astEl, compileOptions = {}) {
      const resourcePath = resolveResourcePath(compileOptions);
      if (resourcePath && !shouldProcessResource(resourcePath, options)) {
        return astEl;
      }

      const nodePath = enterNode(resourcePath);
      const idState = inspectVue2IdState(astEl);

      if (idState.hasBoundId) {
        logDebug(`skip bound id for ${resourcePath || UNKNOWN_RESOURCE}#${nodePath}`);
        return astEl;
      }

      if (idState.hasStaticId && options.respectExistingId) {
        logDebug(`skip existing id for ${resourcePath || UNKNOWN_RESOURCE}#${nodePath}`);
        return astEl;
      }

      const id = createStableId({
        prefix: options.prefix,
        strategy: options.strategy,
        resourcePath,
        contextRoot,
        nodePath,
        astEl
      });

      setStaticAttribute(astEl, 'id', id);
      logDebug(`generated ${id} for ${resourcePath || UNKNOWN_RESOURCE}#${nodePath}`);

      return astEl;
    },

    postTransformNode(astEl) {
      leaveNode();
      return astEl;
    }
  };
}

function resolveResourcePath(compileOptions) {
  if (!compileOptions || typeof compileOptions !== 'object') {
    return null;
  }

  const candidates = [
    compileOptions.filename,
    compileOptions.resourcePath,
    compileOptions.__file,
    compileOptions.source
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function setStaticAttribute(astEl, name, value) {
  if (!astEl || typeof astEl !== 'object') {
    return;
  }

  if (!astEl.attrsMap || typeof astEl.attrsMap !== 'object') {
    astEl.attrsMap = {};
  }

  if (!Array.isArray(astEl.attrsList)) {
    astEl.attrsList = [];
  }

  const existingAttr = astEl.attrsList.find((attr) => attr && attr.name === name);
  if (existingAttr) {
    existingAttr.value = value;
  } else {
    astEl.attrsList.push({ name, value });
  }

  astEl.attrsMap[name] = value;

  if (astEl.rawAttrsMap && typeof astEl.rawAttrsMap === 'object') {
    astEl.rawAttrsMap[name] = {
      name,
      value
    };
  }
}

module.exports = {
  MODULE_MARKER,
  createVueStableIdCompilerModule,
  resolveResourcePath,
  setStaticAttribute
};
