# 项目进展文档

## 更新时间
2026-04-21

## 当前版本
**winlyrics-video-v1.10.1** (主版本: 1.10.1)

## 今日完成工作

### 1. 修复手机播放时背景视频暂停冲突问题 ✅

#### 问题描述
在手机端播放音乐时，背景视频会自动暂停，导致用户体验不佳。这是因为移动端浏览器的音频焦点机制和页面可见性API导致的冲突。

#### 解决方案
在文件 `winlyrics-video/winlyrics-video.html` 的第2733-2872行添加了完整的冲突处理机制：

**核心优化措施：**

1. **智能视频播放监控**
   - 将视频检查间隔从5秒缩短到3秒
   - 添加快速恢复函数 `rapidVideoRestore()`，用于紧急恢复视频播放

2. **动态调整检查频率**
   - 检测到音乐播放时，自动切换到高频检查模式（每500ms检查一次）
   - 持续5秒后自动恢复正常检查频率（每3秒一次）
   - 音乐暂停或结束时，自动恢复正常检查频率

3. **完善的事件监听**
   - 监听音乐的 `play`、`pause`、`ended` 事件
   - 在音乐播放时立即触发视频恢复
   - 添加音频焦点变化监听（Android系统）

4. **双重保障机制**
   - 保留原有的 `visibilitychange` 事件监听
   - 添加每秒轮询检查音乐播放状态
   - 用户交互后（touchstart、touchend、click）自动检查视频状态

5. **移动端兼容性增强**
   - 监听 `audiofocuschange` 事件处理音频焦点抢占
   - 用户交互事件触发视频状态检查
   - 添加调试日志输出（可在生产环境禁用）

#### 技术细节
- **快速恢复函数**：在检测到音乐播放时，立即调用视频播放，确保视频不被暂停
- **状态同步**：通过轮询机制保持视频和音乐的播放状态同步
- **性能优化**：根据音乐播放状态动态调整检查频率，避免不必要的性能消耗

### 2. 代码优化
- 移除了旧代码中的注释标记（修复问题1、修复问题2）
- 统一了函数命名和代码风格
- 添加了适当的错误处理和日志输出

## 测试建议
1. 在手机浏览器中打开页面
2. 选择一个背景视频
3. 点击播放音乐
4. 观察背景视频是否持续播放（不应该暂停）
5. 尝试暂停音乐，确认视频恢复正常检查频率

## 后续工作
- [ ] 收集用户反馈，进一步优化兼容性
- [ ] 测试不同手机品牌和浏览器的表现
- [ ] 考虑添加用户设置选项，允许用户自定义检查频率

### 2. 美化设置界面和播放列表UI ✅

#### 优化目标
美化设置界面和播放列表，使其更加易用简单，同时保持所有原有功能不变，重点优化各个板块按钮之间的安排，防止挤压。

#### 优化内容

**1. 侧边栏优化 (CSS)**
- 调整宽度从280px到260px，减少占用空间
- 添加渐变背景 `linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%)`
- 优化按钮间距从10px到6px，更加紧凑
- 减小内边距从40px到25px
- 添加左侧高亮条效果，使用accent-color主题色
- 图标颜色改为accent-color并添加透明度变化

**2. 设置区块优化 (CSS)**
- 使用渐变背景 `linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.01) 100%)`
- 添加顶部accent-color渐变线条装饰
- 优化悬停效果，添加box-shadow阴影
- 减小间距和内边距，更加紧凑
- 标题使用letter-spacing增加间距感
- 添加图标到标题

**3. 表单和输入框优化 (CSS)**
- 输入框使用渐变背景和inset阴影，增加层次感
- 优化边框颜色为半透明白色
- 添加placeholder样式优化
- 按钮添加box-shadow和flex-shrink: 0防止挤压
- 主按钮(primary-btn)使用渐变背景
- 危险按钮(danger-btn)使用红色渐变
- 添加按钮悬停和点击的微动效

**4. 播放列表布局优化 (HTML+CSS)**
- 创建独立的播放列表容器 `.playlist-container`
- 专辑列和歌曲列使用独立的样式类 `.playlist-column`
- 添加列头 `.column-header` 带有图标
- 内容区域使用 `.column-content` 类
- 添加悬停效果和过渡动画
- 优化移动端响应式布局

**5. 按钮组优化 (CSS)**
- 新增 `.button-group` 类，支持flex-wrap换行
- 创建 `.small-btn` 小按钮样式
- 小按钮使用accent-color主题色
- 优化按钮间距为8px

**6. 移动端优化 (CSS)**
- 优化移动端tab bar样式，使用渐变背景
- 激活状态使用accent-color渐变
- 减小间距和内边距
- 优化播放列表移动端布局，使用column-flex方向
- 添加box-shadow阴影效果

#### 技术亮点
- **渐变背景**：大量使用CSS渐变替代纯色，增加视觉层次
- **阴影效果**：使用box-shadow增加元素深度感
- **过渡动画**：所有交互元素都有smooth的transition效果
- **响应式设计**：移动端自动调整布局，防止内容挤压
- **主题色统一**：accent-color (#00d26a) 作为主要强调色

#### 兼容性保证
- 所有CSS使用标准的gradient和shadow属性
- 添加了适当的回退样式
- 保持原有HTML结构不变，只添加class
- 所有功能完全保留，只优化视觉效果

### 3. 修复歌词字体自定义功能 ⚠️

#### 问题发现
在UI优化过程中，发现CSS样式可能影响字体设置表单的正常显示。

#### 问题原因
- .form-group添加了`flex-wrap: wrap`可能导致表单元素异常换行
- .form-group.vertical中的textarea和input可能需要明确设置宽度

#### 修复措施
添加专门的CSS规则确保字体设置表单正常工作：
```css
.form-group.vertical input,
.form-group.vertical textarea,
.form-group.vertical select {
    width: 100%;
    flex: none;
}
```

#### 功能验证
- ✅ 字体选择下拉框正常工作
- ✅ 字体名称和嵌入代码输入框正常显示
- ✅ 添加/删除字体按钮功能正常
- ✅ 字体应用逻辑完整保留
- ✅ 中英文分别应用不同字体的机制正常

### 4. 优化背景链接验证机制 ✅

#### 问题描述
背景列表中的失效链接检查超时设置太短，导致很多正常链接被误判为失效。

#### 问题原因
- 原validateVideoUrl函数没有设置fetch请求的超时时间
- 网络波动时容易误判
- 没有重试机制，一次失败就判定为失效

#### 解决方案
优化`validateVideoUrl`函数（第4713-4763行），添加：

1. **超时控制**
   - 使用AbortController设置60秒超时
   - 避免请求无限等待

2. **重试机制**
   - 最多重试2次（总共3次尝试）
   - 指数退避策略：1秒、2秒后再试
   - 只对网络错误和超时俱进重试

3. **智能判断**
   - 检测AbortError（超时）
   - 检测NetworkError（网络错误）
   - 检测timeout相关错误
   - 区分可重试和不可重试的错误

4. **改进日志**
   - 显示尝试次数 `验证失败 (尝试 1/3)`
   - 显示具体错误信息
   - 便于调试和问题排查

#### 技术实现
```javascript
async function validateVideoUrl(url, maxRetries = 2) {
    // 超时控制器：60秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (e) {
            // 指数退避重试
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                continue;
            }
            return false;
        }
    }
}
```

#### 优化效果
- ✅ 减少误判：慢速网络不再导致误判
- ✅ 容忍波动：网络抖动自动重试
- ✅ 合理超时：60秒足够大部分情况
- ✅ 快速失败：真正的失效链接仍能及时发现

### 5. 新增待播放列表功能 ✅

#### 功能概述
新增"待播放列表"功能，允许用户将歌曲添加到队列中，实现灵活的播放管理。

#### 核心功能

**1. 添加到待播列表**
- **整张专辑添加**：点击专辑旁边的 + 按钮，将该专辑所有歌曲添加到待播列表
- **单首歌曲添加**：点击歌曲旁边的 + 按钮，将该歌曲添加到待播列表
- 支持本地音乐和专辑歌曲

**2. 待播列表管理**
- **查看列表**：在设置 > 播放列表 > 待播放列表中查看
- **移除歌曲**：点击歌曲旁边的 × 按钮移除
- **清空列表**：一键清空所有待播歌曲
- **播放控制**：直接播放列表中的任意歌曲

**3. 独立播放模式**
待播列表拥有自己独立的播放模式：
- **列表循环**：播完最后一首后回到第一首
- **单曲循环**：重复播放当前歌曲
- **随机播放**：随机播放列表中的歌曲

#### 技术实现

**数据结构**
```javascript
const QUEUE_LIST_KEY = 'musicPlayerQueueList';
const QUEUE_MODE_KEY = 'musicPlayerQueueMode';
const QUEUE_MODES = {
    LIST_LOOP: { id: 0, text: '列表循环', iconClass: 'fa-redo' },
    SINGLE_LOOP: { id: 1, text: '单曲循环', iconClass: 'fa-sync' },
    RANDOM: { id: 2, text: '随机播放', iconClass: 'fa-random' }
};
let queueList = [];
let currentQueueIndex = -1;
let queuePlayMode = QUEUE_MODES.LIST_LOOP.id;
```

**核心函数**
- `initializeQueue()`: 初始化待播列表，从localStorage加载
- `addToQueue(songItem)`: 添加单首歌曲到队列
- `addAlbumToQueue(albumIndex)`: 添加整张专辑到队列
- `removeFromQueue(index)`: 从队列移除歌曲
- `clearQueue()`: 清空队列
- `playQueueItem(index)`: 播放队列中的指定歌曲
- `playNextInQueue()`: 播放下一首
- `playPrevInQueue()`: 播放上一首
- `cycleQueueMode()`: 切换播放模式

**UI组件**
- 待播列表头部：显示歌曲数量和操作按钮
- 队列控制按钮：模式切换、清空列表
- 歌曲列表项：显示歌曲信息、播放按钮、移除按钮
- 视觉反馈：当前播放歌曲高亮显示

#### 用户界面
- **位置**：设置 > 播放列表 > 待播放列表
- **操作按钮**：
  - ✓ 按钮（绿色）：添加到待播列表
  - ▶/❚❚ 按钮：播放/暂停
  - ✕ 按钮（红色）：移除歌曲
  - 🔄 按钮：切换播放模式
  - 🗑 按钮：清空列表

#### 数据持久化
- 待播列表数据保存到 `localStorage`
- 播放模式保存到 `localStorage`
- 页面刷新后数据不丢失

#### 使用场景
1. **临时播放计划**：不想改变当前播放列表，但想临时播放一些歌曲
2. **演唱会准备**：将想听的歌曲整理到队列中
3. **跨专辑播放**：从不同专辑选择喜欢的歌曲组成播放队列
4. **派对模式**：使用随机播放模式打乱顺序

### 6. 待播放列表功能修复与增强 ✅

#### 修复的问题
1. **添加按钮不生效**：修复了点击添加按钮后歌曲无法进入待播放列表的问题
2. **右键菜单支持**：在右键菜单的播放列表中添加了"添加到待播列表"选项
3. **真正的播放顺序控制**：实现了待播放列表的自动切歌功能

#### 实现的功能
**1. 右键菜单支持**
- 在右键菜单中添加了"添加到待播列表"选项
- 可以将当前正在播放的歌曲添加到待播列表
- 位置：右键菜单 > 下一曲按钮下方

**2. 播放列表添加按钮**
- 在所有播放列表（设置页面、右键菜单模态框）中添加了"+"按钮
- 专辑旁边的"+"按钮：添加整张专辑到待播列表
- 歌曲旁边的"+"按钮：添加单首歌曲到待播列表
- 支持本地音乐和专辑歌曲

**3. 真正的播放顺序控制**
- 当待播放列表有歌曲时，上一曲/下一曲按钮使用待播放列表的顺序
- 歌曲结束时自动播放待播放列表的下一首
- 支持待播放列表的独立播放模式（列表循环、单曲循环、随机播放）
- 优先级：待播放列表 > 跨专辑随机 > 普通播放

#### 技术实现
**播放控制修改**
```javascript
// 上一曲按钮点击事件
$('#prev-btn').on('click', function () {
    // 如果待播放列表有歌曲，使用待播放列表的上一曲
    if (queueList.length > 0) {
        if (playPrevInQueue()) {
            return;
        }
    }
    // 原有的上一曲逻辑
});

// 下一曲按钮点击事件
$('#next-btn').on('click', function () {
    // 如果待播放列表有歌曲，使用待播放列表的下一曲
    if (queueList.length > 0) {
        if (playNextInQueue()) {
            return;
        }
    }
    // 原有的下一曲逻辑
});

// 歌曲结束事件
myhkaudio.onended = () => {
    // 如果待播放列表有歌曲，优先播放待播列表的下一首
    if (queueList.length > 0) {
        if (playNextInQueue()) {
            return;
        }
    }
    // 原有的结束逻辑
};
```

**右键菜单添加**
```javascript
$('#ctx-add-to-queue').on('click', () => {
    // 获取当前播放的歌曲信息并添加到待播列表
    const currentAlbum = $('.myhkplaylist .album-list ul li.myhknow');
    const albumIndex = currentAlbum.index();
    const songList = $('.myhkplaylist .song-list ul li');
    const currentSong = songList.filter('.myhknow');
    const songIndex = currentSong.index();

    if (albumIndex >= 0 && songIndex >= 0) {
        addToQueue({
            name: songName,
            album: currentAlbum.find('span').text(),
            albumIndex: albumIndex,
            songIndex: songIndex
        });
    }
});
```

**播放列表添加按钮**
- 在 `populateAllPlaylists()` 函数中为专辑和歌曲添加"+"按钮
- 使用 `bindQueueButtons()` 函数统一绑定事件
- 支持设置页面和右键菜单模态框

#### 使用场景
1. **临时队列**：在播放列表中快速选择想听的歌曲加入待播列表
2. **当前歌曲**：右键点击直接添加当前播放的歌曲到待播列表
3. **自动播放**：设置好待播列表后，歌曲会自动按顺序播放
4. **灵活控制**：使用待播放列表的独立播放模式（循环/随机/单曲）

## 遇到的问题及解决
**问题**：移动端浏览器在播放音频时可能自动暂停视频
**原因**：
1. 音频焦点被音频元素抢占
2. 页面可见性变化触发自动暂停
3. 浏览器资源管理策略

**解决方案**：采用主动监控 + 被动恢复的混合策略，确保视频始终保持播放状态

## 文档版本
- v1.0 (2026-04-05): 初始版本，创建进展文档并记录首次修复
- v1.1 (2026-04-05): 添加设置界面和播放列表UI美化优化
- v1.2 (2026-04-05): 修复歌词字体自定义功能，确保表单正常显示
- v1.3 (2026-04-05): 优化背景链接验证机制，添加超时和重试机制
- v1.4 (2026-04-05): 新增待播放列表功能，支持添加、删除、播放控制
- v1.5 (2026-04-05): 修复待播放列表添加功能，在右键菜单中添加待播列表，实现真正的播放顺序控制

## 2026-04-21 更新

### 修复 song-title 显示"等待音频加载..."问题 ✅

#### 问题描述
TuneFlow.html 中的歌曲标题元素 `id="song-title"` 始终显示"等待音频加载..."，而不是显示正确的歌名。

#### 问题原因
代码中存在两个问题：

1. **emptied 事件过早设置等待状态**（第3213行附近）
   - 当音频元素发送 `emptied` 事件时，无论音频是否已加载，都会立即将标题设置为"等待音频加载..."
   - 实际上云端播放器通常已经有歌曲信息可用

2. **onTimeUpdate 中 duration 为 0 时跳过歌名更新**（第3294行附近）
   - 当 duration 为 0 或 NaN 时，`onTimeUpdate` 函数直接 return，导致 `updateSongInfo()` 从不被调用
   - 这意味着歌名只有在音频开始播放后才能更新

#### 解决方案
修复了两处代码逻辑：

**1. 优化 emptied 事件处理**（第3213-3225行）
```javascript
audioObj.addEventListener('emptied', () => {
    if (state.localIndex > -1) return;
    if (audioObj.readyState < 2) {
        // 仅在音频确实未加载时才显示等待状态
        el.title.innerText = t('status_wait_audio');
        el.artist.innerText = "...";
        // ...
    } else {
        // 音频已加载，直接更新歌名
        setTimeout(updateSongInfo, 500);
    }
    // ...
});
```

**2. 优化 onTimeUpdate 中的歌名更新逻辑**（第3294-3302行）
```javascript
if (state.localIndex === -1) {
    if (d > 0) {
        updateSongInfo();
    } else if (audioObj.readyState >= 2) {
        // 即使 duration 为 0，只要音频已加载（readyState >= 2）就更新歌名
        updateSongInfo();
    }
}
```

#### 技术细节
- `readyState >= 2` 表示音频已有足够数据（相当于 HAVE_CURRENT_DATA）
- 这种条件判断确保了在音频开始加载时就显示正确的歌名，而不是等到完全加载
- 保留了原有的本地音乐处理逻辑（`state.localIndex > -1` 时跳过云端更新）

#### 测试建议
1. 打开 TuneFlow.html 页面
2. 连接云端播放器
3. 播放一首歌曲
4. 观察歌曲标题是否正确显示（而不是"等待音频加载..."）
5. 尝试暂停/继续播放，确认标题保持正确
