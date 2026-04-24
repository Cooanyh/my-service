# TuneFlow 进展文档

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