## 2026-05-01 - TuneFlow 6.2.4 GitHub 整理发布
### 本次处理

- 新增面向公开仓库的 `README.md`
- 新增 `TuneFlow/.gitignore`，默认忽略 `songs.json`、`songs.matched.json`、`songs.player-map.json`、`songs.player-map.js`
- 移除脚本和 GUI 内置的默认 `myhkw key`
- 停止在 `songs.player-map.*` 中透传 `myhkwKey`
- 将历史版本页面统一归档到 `archive/versions/`

### 版本归档

- 归档上一版页面为 `TuneFlow-v6.2.3.html`
- 当前主页面版本号从 `6.2.3` 更新为 `6.2.4`

---
# TuneFlow 进展文档

## 2026-05-01 - B站视频后台播放支持

### 问题描述

B站嵌入视频在切换标签页或窗口后会自动暂停，影响用户体验。

### 解决方案

在页面 `<head>` 最开始注入脚本，欺骗B站播放器页面始终处于前台状态。

### 技术实现

1. **重写 document 属性**
   - `document.hidden` 始终返回 `false`
   - `document.visibilityState` 始终返回 `'visible'`
   - 同时处理各浏览器前缀版本 (`webkitHidden`, `mozHidden`, `msHidden`)

2. **重写 document.hasFocus()**
   - 始终返回 `true`

3. **拦截事件监听**
   - 阻止 `visibilitychange` 相关事件的注册
   - 阻止 `blur`, `focusout`, `pagehide` 事件的注册

4. **拦截事件分发**
   - 重写 `document.dispatchEvent` 和 `window.dispatchEvent`
   - 过滤掉可见性相关事件

### 代码位置

`<head>` 标签内，紧跟 `<meta charset>` 之后

### 版本更新

- 从 6.2.2 升级到 6.2.3

### 注意事项

- 此方案在页面加载最开始就执行，确保在任何脚本加载前生效
- 覆盖了多种浏览器前缀的可见性 API
- 同时处理了事件监听和事件分发两个层面

---

## 2026-04-24 - DeepSeek 模型升级

### 更新内容

**模型升级**: 将 DeepSeek 模型从 `deepseek-chat` 升级为 `deepseek-v4-flash`

**新增参数**: 所有 API 调用添加 `thinking: {"type": "disabled"}` 参数，关闭思考模式以获得更快响应

### 修改位置

1. **translateText 函数** (第 4691 行附近)
   - 用于逐行翻译歌词的 API 调用
   - 保留 `temperature: 0.3` 和 `max_tokens: 200` 参数

2. **translateEntireSongWithStreaming 函数** (第 4877 行附近)
   - 用于整首歌流式翻译的 API 调用
   - 保留 `temperature: 0.3`、`max_tokens: 8000` 和 `stream: true` 参数

3. **testApiKey 函数** (第 5352 行附近)
   - 用于测试 API Key 有效性的 API 调用
   - 保留 `max_tokens: 5` 参数

### 代码变更示例

```javascript
// 修改前
body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [...],
    temperature: 0.3,
    max_tokens: 200
})

// 修改后
body: JSON.stringify({
    model: 'deepseek-v4-flash',
    messages: [...],
    temperature: 0.3,
    max_tokens: 200,
    thinking: {"type": "disabled"}
})
```

### Git 提交信息

```
commit 67275ad
升级 DeepSeek 模型至 v4-flash 并关闭思考模式

- translateText: 将模型从 deepseek-chat 升级为 deepseek-v4-flash，添加 thinking: {type: disabled}
- translateEntireSongWithStreaming: 将模型从 deepseek-chat 升级为 deepseek-v4-flash，添加 thinking: {type: disabled}
- testApiKey: 将模型从 deepseek-chat 升级为 deepseek-v4-flash，添加 thinking: {type: disabled}
- 保留原有的 temperature 和 max_tokens 参数配置
```

---

**作者**: Coren
**项目地址**: https://github.com/Cooanyh/my-service

