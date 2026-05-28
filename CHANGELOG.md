# Changelog

## 1.1.0

### Added

- 增加 Vue 3 / Vite 适配器，支持在 `@vitejs/plugin-vue` 之前对 `.vue` 源码进行稳定 ID 预处理。
- 增加真实 `webpack + vue-loader` fixture 集成测试，验证属性变化不会破坏稳定 ID。
- 增加 `content`、`hybrid` 两种 ID 生成策略，保留 `path-position` 作为默认策略。

### Changed

- 将插件结构重构为核心逻辑 + Webpack/Vue2 适配层 + Vite/Vue3 适配层。
- 改为默认保留已有静态 `id`，并跳过 `:id` / `v-bind:id` 绑定节点。
- 更新 README，补齐 Vue 2 / Vue 3 的使用方式、配置项和生成规则说明。

### Fixed

- 修复 `vue-loader` 注入逻辑对常见嵌套规则结构支持不完整的问题。
- 去除错误的运行时 `crypto` 依赖声明。
