
        const loadBtn = document.getElementById('load-btn');
        const exportBtn = document.getElementById('export-btn');
        const resetBtn = document.getElementById('reset-btn');
        const selectAllBtn = document.getElementById('select-all-btn');
        const clearAllBtn = document.getElementById('clear-all-btn');
        const keyInput = document.getElementById('key-input');
        const filenameInput = document.getElementById('filename-input');
        const statusEl = document.getElementById('status');
        const logEl = document.getElementById('log');
        const playlistListEl = document.getElementById('playlist-list');
        const selectionPillEl = document.getElementById('selection-pill');
        const statPlaylistsEl = document.getElementById('stat-playlists');
        const statSelectedPlaylistsEl = document.getElementById('stat-selected-playlists');
        const statSelectedSongsEl = document.getElementById('stat-selected-songs');

        const state = {
            activeScript: null,
            playlistSource: [],
            playlistSummary: [],
            selectedIndexes: new Set(),
            playlistMode: 'script'
        };

        function log(message) {
            if (logEl.textContent === '日志会显示在这里。') {
                logEl.textContent = '';
            }
            logEl.textContent += `${message}\n`;
            logEl.scrollTop = logEl.scrollHeight;
        }

        function setStatus(message) {
            statusEl.textContent = message;
        }

        function resetGlobals() {
            try { delete window.songSheetList; } catch (_) { window.songSheetList = undefined; }
            try { delete window.songSheetListData; } catch (_) { window.songSheetListData = undefined; }
        }

        function cleanupScript() {
            if (state.activeScript) {
                state.activeScript.remove();
                state.activeScript = null;
            }
            resetGlobals();
        }

        function findArray(source, keys) {
            for (const key of keys) {
                if (Array.isArray(source?.[key])) return source[key];
            }
            return null;
        }

        function findString(source, keys) {
            for (const key of keys) {
                const value = source?.[key];
                if (typeof value === 'string' && value.trim()) return value.trim();
            }
            return null;
        }

        function findArtistArray(album) {
            return findArray(album, [
                'singerNames',
                'songSingerNames',
                'songArtists',
                'artistNames',
                'artists',
                'authors',
                'songAuthors',
                'songSingers'
            ]);
        }

        function findCoverArray(album) {
            return findArray(album, [
                'songPics',
                'songPictures',
                'songCovers',
                'songImages',
                'covers',
                'imgs',
                'pics'
            ]);
        }

        function findDurationArray(album) {
            return findArray(album, [
                'songTimes',
                'songDurations',
                'durations',
                'times'
            ]);
        }

        function normalizeTrackDuration(value) {
            if (value == null || value === '') return null;
            if (typeof value === 'number') return value;

            const text = String(value).trim();
            if (/^\d+$/.test(text)) return Number(text);

            const parts = text.split(':').map(Number);
            if (parts.every(Number.isFinite)) {
                return parts.reduce((total, current) => total * 60 + current, 0);
            }

            return text;
        }

        function getAlbumTitle(album, albumIndex) {
            return findString(album, ['title', 'name', 'albumName', 'sheetName']) || `Album ${albumIndex + 1}`;
        }

        function summarizeSongSheetList(songSheetList) {
            return songSheetList.map((album, albumIndex) => {
                const ids = findArray(album, ['rids', 'songIds', 'songList']) || [];
                const types = findArray(album, ['songFrom3', 'songFrom', 'songTypes']) || [];
                const titles = findArray(album, ['songNames', 'songName', 'titles', 'names']) || [];
                const artists = findArtistArray(album) || [];
                const covers = findCoverArray(album) || [];
                const durations = findDurationArray(album) || [];

                return {
                    index: albumIndex,
                    labelIndex: albumIndex + 1,
                    title: getAlbumTitle(album, albumIndex),
                    count: Math.max(ids.length, types.length, titles.length, artists.length, covers.length, durations.length)
                };
            });
        }

        function flattenSongSheetList(songSheetList, key) {
            const songs = [];

            songSheetList.forEach((album, albumIndex) => {
                const ids = findArray(album, ['rids', 'songIds', 'songList']) || [];
                const types = findArray(album, ['songFrom3', 'songFrom', 'songTypes']) || [];
                const titles = findArray(album, ['songNames', 'songName', 'titles', 'names']) || [];
                const artists = findArtistArray(album) || [];
                const covers = findCoverArray(album) || [];
                const durations = findDurationArray(album) || [];

                const albumTitle = getAlbumTitle(album, albumIndex);
                const albumCover = findString(album, ['cover', 'img', 'pic']);
                const count = Math.max(ids.length, types.length, titles.length, artists.length, covers.length, durations.length);

                for (let songIndex = 0; songIndex < count; songIndex += 1) {
                    const title = titles[songIndex] ?? '';
                    const artist = artists[songIndex] ?? '';

                    songs.push({
                        order: songs.length + 1,
                        title: typeof title === 'string' ? title.trim() : String(title || '').trim(),
                        artist: typeof artist === 'string' ? artist.trim() : String(artist || '').trim(),
                        id: ids[songIndex] ?? null,
                        type: types[songIndex] ?? null,
                        album: albumTitle,
                        albumIndex,
                        songIndex,
                        cover: covers[songIndex] || albumCover || null,
                        duration: normalizeTrackDuration(durations[songIndex])
                    });
                }
            });

            return songs.filter(song => song.title || song.id || song.artist);
        }

        function downloadJson(filename, data) {
            const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        }

        function waitForSongSheetList(timeoutMs = 8000) {
            return new Promise((resolve, reject) => {
                const started = Date.now();
                const timer = window.setInterval(() => {
                    const list = window.songSheetList || window.songSheetListData;
                    if (Array.isArray(list) && list.length > 0) {
                        clearInterval(timer);
                        resolve(list);
                        return;
                    }
                    if (Date.now() - started > timeoutMs) {
                        clearInterval(timer);
                        reject(new Error('Timeout while waiting for songSheetList. Please verify the key.'));
                    }
                }, 250);
            });
        }

        function waitForPlaylistReady(timeoutMs = 15000) {
            return new Promise((resolve, reject) => {
                const started = Date.now();
                const timer = window.setInterval(() => {
                    const albumNodes = document.querySelectorAll('.myhkplaylist .album-list ul li');
                    const playlistRoot = document.querySelector('.myhkplaylist');
                    if (playlistRoot && albumNodes.length > 0) {
                        clearInterval(timer);
                        resolve();
                        return;
                    }
                    if (Date.now() - started > timeoutMs) {
                        clearInterval(timer);
                        reject(new Error('Timeout while waiting for myhkw playlist DOM. Please verify the player loaded correctly.'));
                    }
                }, 250);
            });
        }

        function currentSongListSnapshot() {
            const songNodes = Array.from(document.querySelectorAll('.myhkplaylist .song-list ul li'));
            return {
                count: songNodes.length,
                first: songNodes[0]?.innerText?.trim() || ''
            };
        }

        function waitForSongListChange(previousSnapshot, timeoutMs = 6000) {
            return new Promise((resolve) => {
                const started = Date.now();
                const timer = window.setInterval(() => {
                    const nextSnapshot = currentSongListSnapshot();
                    const hasChanged = nextSnapshot.count > 0 && (
                        nextSnapshot.count !== previousSnapshot.count ||
                        nextSnapshot.first !== previousSnapshot.first
                    );

                    if (hasChanged || (nextSnapshot.count > 0 && Date.now() - started > 800)) {
                        clearInterval(timer);
                        setTimeout(resolve, 220);
                        return;
                    }

                    if (Date.now() - started > timeoutMs) {
                        clearInterval(timer);
                        setTimeout(resolve, 220);
                    }
                }, 120);
            });
        }

        function scrapeSongsFromCurrentDom(albumName, key, albumIndex) {
            const songNodes = Array.from(document.querySelectorAll('.myhkplaylist .song-list ul li'));
            return songNodes.map((node, songIndex) => {
                const fullText = node.innerText?.trim() || '';
                const parts = fullText.split(/\s*-\s*/);
                const title = parts[0]?.trim() || fullText;
                const artist = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';

                return {
                    order: 0,
                    title,
                    artist,
                    id: null,
                    type: null,
                    album: albumName,
                    albumIndex,
                    songIndex,
                    cover: null,
                    duration: null
                };
            }).filter(song => song.title);
        }

        async function buildPlaylistSummaryFromDom() {
            await waitForPlaylistReady();
            const albumNodes = Array.from(document.querySelectorAll('.myhkplaylist .album-list ul li'));
            const summary = [];

            for (let albumIndex = 0; albumIndex < albumNodes.length; albumIndex += 1) {
                const liveAlbumNodes = Array.from(document.querySelectorAll('.myhkplaylist .album-list ul li'));
                const albumNode = liveAlbumNodes[albumIndex];
                if (!albumNode) continue;

                const albumName = albumNode.innerText.replace(/^[^>]*>\s*/, '').trim() || `Album ${albumIndex + 1}`;
                const before = currentSongListSnapshot();
                albumNode.click();
                await waitForSongListChange(before);
                const count = document.querySelectorAll('.myhkplaylist .song-list ul li').length;

                summary.push({
                    index: albumIndex,
                    labelIndex: albumIndex + 1,
                    title: albumName,
                    count
                });
            }

            return summary;
        }

        async function exportSongsFromDomSelected(key) {
            await waitForPlaylistReady();
            const songs = [];
            const seen = new Set();
            const selectedIndexes = Array.from(state.selectedIndexes).sort((a, b) => a - b);

            for (const albumIndex of selectedIndexes) {
                const liveAlbumNodes = Array.from(document.querySelectorAll('.myhkplaylist .album-list ul li'));
                const albumNode = liveAlbumNodes[albumIndex];
                if (!albumNode) continue;

                const albumName = albumNode.innerText.replace(/^[^>]*>\s*/, '').trim() || `Album ${albumIndex + 1}`;
                const before = currentSongListSnapshot();
                albumNode.click();
                await waitForSongListChange(before);

                const albumSongs = scrapeSongsFromCurrentDom(albumName, key, albumIndex);
                log(`已扫描歌单《${albumName}》：${albumSongs.length} 首歌`);

                albumSongs.forEach((song) => {
                    const dedupeKey = `${song.album}::${song.title}::${song.artist}`;
                    if (seen.has(dedupeKey)) return;
                    seen.add(dedupeKey);
                    songs.push({
                        ...song,
                        order: songs.length + 1
                    });
                });
            }

            return songs;
        }

        function renderPlaylistList() {
            if (!state.playlistSummary.length) {
                playlistListEl.innerHTML = '<div class="playlist-meta">先点击“第 1 步：读取歌单”，然后在这里选择要导出的歌单。</div>';
                return;
            }

            playlistListEl.innerHTML = state.playlistSummary.map((album) => {
                const checked = state.selectedIndexes.has(album.index);
                return `
                    <label class="playlist-item ${checked ? 'selected' : ''}" data-index="${album.index}">
                        <div class="playlist-row">
                            <input type="checkbox" data-role="playlist-checkbox" data-index="${album.index}" ${checked ? 'checked' : ''}>
                            <div class="playlist-title">${album.labelIndex}. ${album.title}</div>
                        </div>
                        <div class="playlist-meta">预计 ${album.count} 首歌</div>
                    </label>
                `;
            }).join('');
        }

        function updateSelectionSummary() {
            const selectedPlaylists = state.playlistSummary.filter((album) => state.selectedIndexes.has(album.index));
            const selectedSongCount = selectedPlaylists.reduce((sum, album) => sum + album.count, 0);
            const hasExportableSelection = selectedPlaylists.length > 0
                && (state.playlistMode === 'dom' || state.playlistSource.length > 0);

            statPlaylistsEl.textContent = String(state.playlistSummary.length);
            statSelectedPlaylistsEl.textContent = String(selectedPlaylists.length);
            statSelectedSongsEl.textContent = String(selectedSongCount);
            selectionPillEl.textContent = selectedPlaylists.length
                ? `已选择 ${selectedPlaylists.length} 个歌单`
                : '未选择歌单';

            exportBtn.disabled = !hasExportableSelection;
            selectAllBtn.disabled = state.playlistSummary.length === 0;
            clearAllBtn.disabled = state.playlistSummary.length === 0;
        }

        function setAllSelections(checked) {
            state.selectedIndexes = checked
                ? new Set(state.playlistSummary.map((album) => album.index))
                : new Set();
            renderPlaylistList();
            updateSelectionSummary();
        }

        async function loadPlaylists() {
            const key = keyInput.value.trim();

            if (!key) {
                setStatus('请先输入 myhkw key');
                return;
            }

            loadBtn.disabled = true;
            exportBtn.disabled = true;
            cleanupScript();
            state.playlistSource = [];
            state.playlistSummary = [];
            state.selectedIndexes = new Set();
            renderPlaylistList();
            updateSelectionSummary();

            setStatus('正在加载播放器并扫描歌单...');
            log('已收到 myhkw key，开始加载播放器并扫描页面中的歌单列表...');

            try {
                const script = document.createElement('script');
                script.id = 'myhk';
                script.type = 'text/javascript';
                script.src = `https://myhkw.cn/api/player/${key}`;
                script.setAttribute('key', key);
                script.setAttribute('m', '1');
                script.async = true;
                script.defer = true;
                state.activeScript = script;
                document.body.appendChild(script);

                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('加载 myhkw 播放器失败，请检查 key 是否正确。'));
                });

                state.playlistMode = 'dom';
                state.playlistSource = [];
                state.playlistSummary = await buildPlaylistSummaryFromDom();
                log('已通过 DOM 扫描到歌单列表。');

                state.selectedIndexes = new Set(state.playlistSummary.map((album) => album.index));

                renderPlaylistList();
                updateSelectionSummary();

                log(`共读取到 ${state.playlistSummary.length} 个歌单：`);
                state.playlistSummary.forEach((album) => {
                    log(`- ${album.labelIndex}. ${album.title}（${album.count} 首歌）`);
                });
                setStatus(`已读取 ${state.playlistSummary.length} 个歌单，请勾选后导出`);
            } catch (error) {
                setStatus('读取歌单失败');
                log(`Error: ${error.message}`);
            } finally {
                loadBtn.disabled = false;
            }
        }

        function getSelectedSongSheetList() {
            return state.playlistSummary
                .filter((album) => state.selectedIndexes.has(album.index))
                .map((album) => state.playlistSource[album.index])
                .filter(Boolean);
        }

        async function exportSongs() {
            const key = keyInput.value.trim();
            const filename = (filenameInput.value.trim() || 'songs.json').replace(/[\\/:*?"<>|]+/g, '_');
            const selectedSongSheetList = getSelectedSongSheetList();
            const hasSelectedPlaylists = state.playlistSummary.some((album) => state.selectedIndexes.has(album.index));

            if (!key) {
                setStatus('请先输入 myhkw key');
                return;
            }

            if (!hasSelectedPlaylists) {
                setStatus('请至少选择一个歌单');
                return;
            }

            exportBtn.disabled = true;
            setStatus('正在导出 songs.json...');

            try {
                const songs = state.playlistMode === 'dom'
                    ? await exportSongsFromDomSelected(key)
                    : flattenSongSheetList(selectedSongSheetList, key);
                if (!songs.length) {
                    throw new Error('未能从当前页面中提取到歌曲。');
                }

                downloadJson(filename, songs);
                setStatus(`导出完成，共 ${songs.length} 首歌`);
                log(`导出完成：共 ${songs.length} 首歌`);
                log(`输出文件：${filename}`);
            } catch (error) {
                setStatus('导出失败');
                log(`Error: ${error.message}`);
            } finally {
                exportBtn.disabled = false;
                updateSelectionSummary();
            }
        }

        loadBtn.addEventListener('click', loadPlaylists);
        exportBtn.addEventListener('click', exportSongs);
        resetBtn.addEventListener('click', () => {
            keyInput.value = '';
        });
        selectAllBtn.addEventListener('click', () => setAllSelections(true));
        clearAllBtn.addEventListener('click', () => setAllSelections(false));

        playlistListEl.addEventListener('change', (event) => {
            const checkbox = event.target.closest('input[data-role="playlist-checkbox"]');
            if (!checkbox) return;
            const index = Number(checkbox.dataset.index);
            if (checkbox.checked) {
                state.selectedIndexes.add(index);
            } else {
                state.selectedIndexes.delete(index);
            }
            renderPlaylistList();
            updateSelectionSummary();
        });

        renderPlaylistList();
        updateSelectionSummary();
    
