# vue-stable-id-plugin

为 Vue 2 + Webpack，以及 Vue 3 + Vite 项目中的模板节点自动生成稳定的 `id` 属性。

这个插件默认按“组件文件路径 + 模板节点位置”生成 ID，因此同一节点即使属性值发生变化，只要它在模板中的位置不变，生成的 `id` 就保持稳定。

## 当前支持范围

- Vue 2
- Webpack
- `vue-loader`
- Vue 3
- Vite
- `@vitejs/plugin-vue` 之前执行的源码级 SFC 预处理

当前版本已经按“核心逻辑 + 适配层”拆分结构：

- `new VueStableIdPlugin()` 用于 Vue 2 + Webpack
- `createViteVueStableIdPlugin()` 用于 Vue 3 + Vite

## 安装

```bash
npm install vue-stable-id-plugin
```

## 使用

```js
const VueStableIdPlugin = require('vue-stable-id-plugin');

module.exports = {
  // ...
  plugins: [
    new VueStableIdPlugin({
      prefix: 'vsi-',
      strategy: 'path-position'
    })
  ]
};
```

### Vite / Vue 3

```js
import vue from '@vitejs/plugin-vue';
import stableIdPlugin from 'vue-stable-id-plugin';

const { createViteVueStableIdPlugin } = stableIdPlugin;

export default {
  plugins: [
    createViteVueStableIdPlugin({
      prefix: 'vsi-',
      strategy: 'path-position'
    }),
    vue()
  ]
};
```

## 生成规则

默认策略是 `path-position`：

- 组件文件路径参与哈希
- 模板中的节点位置参与哈希
- 节点标签参与哈希
- 已有显式 `id` 默认不覆盖
- 已有 `:id` / `v-bind:id` 绑定时默认跳过，不追加静态 `id`

这意味着：

- 修改 `class`、`style`、`data-*` 等属性值时，ID 通常不会变化
- 调整节点在模板中的结构位置时，ID 会变化
- 跨文件但结构相同的节点不会生成相同 ID

## 配置项

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `prefix` | `string` | `'vsi-'` | 生成 ID 的前缀 |
| `strategy` | `'path-position' \| 'content' \| 'hybrid'` | `'path-position'` | ID 生成策略 |
| `include` | `string \| RegExp \| Function \| Array` | `null` | 只处理命中的文件 |
| `exclude` | `string \| RegExp \| Function \| Array` | `null` | 跳过命中的文件 |
| `respectExistingId` | `boolean` | `true` | 是否保留模板里已写明的 `id` |
| `debug` | `boolean` | `false` | 输出注入和跳过日志 |
| `logger` | `Function` | `console.log` | 自定义调试日志函数 |

## 策略说明

| 策略 | 说明 | 适用场景 |
|---|---|---|
| `path-position` | 基于路径 + 节点位置生成 | 默认推荐，最符合“稳定 ID”预期 |
| `content` | 基于标签和属性内容生成 | 更看重内容一致性，而不是位置一致性 |
| `hybrid` | 路径/位置/内容共同参与 | 希望更强区分度时使用 |

## 过滤示例

```js
new VueStableIdPlugin({
  include: /src\/views\//,
  exclude: [/node_modules/, 'legacy']
})
```

## 注意事项

- 插件只会注入到命中的 `vue-loader` 配置项
- 支持 `rule.loader`、`rule.use`、`rule.oneOf`、`rule.rules` 的常见 Webpack 写法
- 如果 `vue-loader` 未向编译选项暴露文件路径，插件会退化到匿名资源标识，但仍保持同一编译过程内可预测
- Vite 适配器通过预处理 `.vue` 源码完成注入，因此需要放在 `vue()` 之前

## 开发

```bash
npm test
```
