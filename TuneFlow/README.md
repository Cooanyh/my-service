# TuneFlow

TuneFlow 是一个本地工作流工具集，用来把 myhkw 歌单整理成可播放的 B 站视频映射，并最终交给 `tuneflow.html` 播放器使用。

## 工作流

### 第 1 步：导出歌单

打开 `01-打开歌单导出GUI.bat`。

你需要手动填写自己的 `myhkw key`，然后：

1. 拉取歌单列表
2. 勾选要导出的歌单
3. 导出为 `songs.json`

也可以直接用命令行：

```bash
node TuneFlow/export-myhkw-songs.mjs --key <your-key> --out TuneFlow/songs.json
```

常用参数：

```bash
node TuneFlow/export-myhkw-songs.mjs --key <your-key> --list-albums
node TuneFlow/export-myhkw-songs.mjs --key <your-key> --albums "歌单A,歌单B"
node TuneFlow/export-myhkw-songs.mjs --key <your-key> --album-indexes 1,3,5
```

### 第 2 步：匹配 B 站视频

你有两种方式：

#### 方式 A：GUI 复核

打开 `02-打开歌曲视频复核GUI.bat`。

流程如下：

1. 导入 `songs.json`
2. 自动扫描候选视频
3. 你手动粘贴 BV 链接或完整视频链接
4. 保存并输出 `songs.matched.json`

支持这种完整链接格式：

```text
https://www.bilibili.com/video/BV1Ar4y1U72R/?spm_id_from=333.337.search-card.all.click&vd_source=xxxx
```

#### 方式 B：全自动批量匹配

打开 `02-一键自动匹配视频.bat`，或直接运行：

```bash
node TuneFlow/auto-match-bilibili.mjs
```

脚本会自动搜索并生成 `songs.matched.json`，低置信度结果会标记为 `needsReview: true`，建议后续人工抽查。

### 第 3 步：生成播放器映射

打开 `03-一键生成播放器映射.bat`，或直接运行：

```bash
node TuneFlow/export-player-map.mjs
```

生成结果：

- `songs.player-map.json`
- `songs.player-map.js`

其中 `songs.player-map.js` 适合直接被网页加载。

## 播放器接入

`tuneflow.html` 当前默认从云端读取：

- [https://upyun.coren.xin/web/files/songs.player-map.js](https://upyun.coren.xin/web/files/songs.player-map.js)

远端旧接口：

- `https://agent.coren.xin/api/bilibili/match`

已经弃用，不再参与当前流程。

## 目录说明

主入口：

- `01-打开歌单导出GUI.bat`
- `02-打开歌曲视频复核GUI.bat`
- `02-一键自动匹配视频.bat`
- `03-一键生成播放器映射.bat`
- `tuneflow.html`

核心脚本：

- `export-myhkw-songs.mjs`
- `auto-match-bilibili.mjs`
- `export-player-map.mjs`
- `myhkw-song-exporter.html`
- `song-video-matcher.html`

兼容启动器：

- `打开导出GUI.bat`
- `一键导出songs-json.bat`
- `打开歌曲视频匹配GUI.bat`
- `一键自动匹配视频.bat`
- `一键生成播放器映射.bat`

