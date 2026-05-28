const { parse: parseSfc } = require('@vue/compiler-sfc');
const { baseParse, NodeTypes } = require('@vue/compiler-dom');

const { inspectVue3IdState } = require('../../core/id-detection');
const { shouldProcessResource } = require('../../core/resource-match');
const { createStableId } = require('../../core/stable-id');

function transformVueSfcSource({ code, resourcePath, contextRoot, options }) {
  if (!shouldProcessResource(resourcePath, options)) {
    return null;
  }

  const { descriptor } = parseSfc(code, {
    filename: resourcePath
  });

  if (!descriptor.template) {
    return null;
  }

  const templateBlock = descriptor.template;
  const templateAst = baseParse(templateBlock.content, {
    comments: true
  });
  const insertions = collectTemplateInsertions({
    ast: templateAst,
    source: templateBlock.content,
    resourcePath,
    contextRoot,
    options
  });

  if (insertions.length === 0) {
    return null;
  }

  const blockOffset = templateBlock.loc.start.offset;
  const absoluteInsertions = insertions.map((entry) => ({
    offset: blockOffset + entry.offset,
    text: entry.text
  }));

  return {
    code: applyInsertions(code, absoluteInsertions),
    map: null
  };
}

function collectTemplateInsertions({ ast, source, resourcePath, contextRoot, options }) {
  const insertions = [];

  visitElementChildren(ast.children || [], '', (node, nodePath) => {
    const idState = inspectVue3IdState(node);

    if (idState.hasBoundId) {
      debugLog(options, `skip bound id for ${resourcePath}#${nodePath}`);
      return;
    }

    if (idState.hasStaticId && options.respectExistingId) {
      debugLog(options, `skip existing id for ${resourcePath}#${nodePath}`);
      return;
    }

    const id = createStableId({
      prefix: options.prefix,
      strategy: options.strategy,
      resourcePath,
      contextRoot,
      nodePath,
      astEl: {
        tag: node.tag,
        attrsList: toAttrsList(node.props)
      }
    });

    insertions.push({
      offset: findTagNameEndOffset(source, node.loc.start.offset),
      text: ` id="${id}"`
    });
    debugLog(options, `generated ${id} for ${resourcePath}#${nodePath}`);
  });

  return insertions;
}

function visitElementChildren(children, parentPath, visitor) {
  let elementIndex = 0;

  for (const child of children) {
    if (!child || child.type !== NodeTypes.ELEMENT) {
      continue;
    }

    const nodePath = parentPath ? `${parentPath}.${elementIndex}` : `${elementIndex}`;
    elementIndex += 1;

    visitor(child, nodePath);
    visitElementChildren(child.children || [], nodePath, visitor);
  }
}

function toAttrsList(props) {
  const attrs = [];

  for (const prop of props || []) {
    if (!prop || typeof prop !== 'object') {
      continue;
    }

    if (prop.type === 6) {
      attrs.push({
        name: prop.name,
        value: prop.value ? prop.value.content : ''
      });
      continue;
    }

    if (prop.type === 7) {
      const arg = prop.arg && prop.arg.type === 4 ? prop.arg.content : '';
      const expression = prop.exp ? prop.exp.content : '';
      attrs.push({
        name: prop.rawName || (arg ? `:${arg}` : `v-${prop.name}`),
        value: expression
      });
    }
  }

  return attrs;
}

function findTagNameEndOffset(source, startOffset) {
  const slice = source.slice(startOffset);
  const match = slice.match(/^<([^\t\r\n\f />]+)/);
  if (!match) {
    throw new Error(`Unable to locate tag name at offset ${startOffset}.`);
  }

  return startOffset + match[0].length;
}

function applyInsertions(source, insertions) {
  const sorted = insertions.slice().sort((left, right) => right.offset - left.offset);
  let result = source;

  for (const insertion of sorted) {
    result =
      result.slice(0, insertion.offset) +
      insertion.text +
      result.slice(insertion.offset);
  }

  return result;
}

function debugLog(options, message) {
  if (options.debug) {
    options.logger(`[vite-vue-stable-id] ${message}`);
  }
}

module.exports = {
  applyInsertions,
  collectTemplateInsertions,
  findTagNameEndOffset,
  toAttrsList,
  transformVueSfcSource,
  visitElementChildren
};
