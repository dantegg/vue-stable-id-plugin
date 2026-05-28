function inspectVue2IdState(astEl) {
  const attrsMap = astEl && astEl.attrsMap ? astEl.attrsMap : {};

  return {
    hasStaticId: hasOwn(attrsMap, 'id'),
    hasBoundId: hasOwn(attrsMap, ':id') || hasOwn(attrsMap, 'v-bind:id')
  };
}

function inspectVue3IdState(node) {
  const props = Array.isArray(node && node.props) ? node.props : [];
  let hasStaticId = false;
  let hasBoundId = false;

  for (const prop of props) {
    if (!prop || typeof prop !== 'object') {
      continue;
    }

    if (prop.type === 6 && prop.name === 'id') {
      hasStaticId = true;
      continue;
    }

    if (
      prop.type === 7 &&
      prop.name === 'bind' &&
      prop.arg &&
      prop.arg.type === 4 &&
      prop.arg.content === 'id'
    ) {
      hasBoundId = true;
    }
  }

  return { hasStaticId, hasBoundId };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

module.exports = {
  inspectVue2IdState,
  inspectVue3IdState
};
