#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = path.join(SCRIPT_DIR, 'songs.json');
const MYHKW_SCRIPT_URL = 'https://myhkw.cn/api/player';

function parseArgs(argv) {
    const options = {
        key: null,
        out: DEFAULT_OUTPUT,
        albumNames: [],
        albumIndexes: [],
        listAlbums: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--key' && argv[i + 1]) {
            options.key = argv[i + 1];
            i += 1;
        } else if (arg === '--out' && argv[i + 1]) {
            options.out = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        } else if (arg === '--albums' && argv[i + 1]) {
            options.albumNames = argv[i + 1].split(',').map((item) => item.trim()).filter(Boolean);
            i += 1;
        } else if (arg === '--album-indexes' && argv[i + 1]) {
            options.albumIndexes = argv[i + 1]
                .split(',')
                .map((item) => Number(item.trim()))
                .filter((item) => Number.isInteger(item) && item >= 1);
            i += 1;
        } else if (arg === '--list-albums') {
            options.listAlbums = true;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp() {
    console.log(`Export myhkw playlist songs to a local songs.json

Usage:
  node TuneFlow/export-myhkw-songs.mjs --key <myhkw-key> [--out <path>]

Examples:
  node TuneFlow/export-myhkw-songs.mjs --key <your-key>
  node TuneFlow/export-myhkw-songs.mjs --out TuneFlow/songs.json
  node TuneFlow/export-myhkw-songs.mjs --list-albums
  node TuneFlow/export-myhkw-songs.mjs --albums "歌单A,歌单B"
  node TuneFlow/export-myhkw-songs.mjs --album-indexes 1,3,5
`);
}

async function fetchRemoteScript(key) {
    const response = await fetch(`${MYHKW_SCRIPT_URL}/${key}`, {
        headers: {
            'user-agent': 'TuneFlow songs exporter'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch myhkw player script: HTTP ${response.status}`);
    }

    return response.text();
}

function extractAssignedExpression(source, variableName) {
    const assignPattern = new RegExp(`(?:var|let|const)?\\s*${variableName}\\s*=\\s*`);
    const match = assignPattern.exec(source);
    if (!match || match.index === -1) {
        throw new Error(`Could not find assignment for ${variableName}`);
    }

    let valueStart = match.index + match[0].length;
    while (valueStart < source.length && /\s/.test(source[valueStart])) {
        valueStart += 1;
    }
    const firstChar = source[valueStart];
    if (firstChar !== '[' && firstChar !== '{') {
        throw new Error(`${variableName} is not assigned to an array/object literal`);
    }

    const stack = [firstChar];
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    for (let i = valueStart + 1; i < source.length; i += 1) {
        const char = source[i];
        const next = source[i + 1];

        if (inLineComment) {
            if (char === '\n') inLineComment = false;
            continue;
        }

        if (inBlockComment) {
            if (char === '*' && next === '/') {
                inBlockComment = false;
                i += 1;
            }
            continue;
        }

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\' && (inSingle || inDouble || inTemplate)) {
            escaped = true;
            continue;
        }

        if (!inSingle && !inDouble && !inTemplate) {
            if (char === '/' && next === '/') {
                inLineComment = true;
                i += 1;
                continue;
            }
            if (char === '/' && next === '*') {
                inBlockComment = true;
                i += 1;
                continue;
            }
        }

        if (char === '\'' && !inDouble && !inTemplate) {
            inSingle = !inSingle;
            continue;
        }
        if (char === '"' && !inSingle && !inTemplate) {
            inDouble = !inDouble;
            continue;
        }
        if (char === '`' && !inSingle && !inDouble) {
            inTemplate = !inTemplate;
            continue;
        }

        if (inSingle || inDouble || inTemplate) {
            continue;
        }

        if (char === '[' || char === '{') {
            stack.push(char);
            continue;
        }

        if (char === ']' || char === '}') {
            const open = stack.pop();
            const validPair = (open === '[' && char === ']') || (open === '{' && char === '}');
            if (!validPair) {
                throw new Error(`Malformed literal while parsing ${variableName}`);
            }
            if (stack.length === 0) {
                return source.slice(valueStart, i + 1);
            }
        }
    }

    throw new Error(`Could not find the end of ${variableName}`);
}

function evaluateLiteral(literal, label) {
    const context = vm.createContext({});
    return vm.runInContext(`(${literal})`, context, { timeout: 2000, filename: label });
}

function pickArray(album, candidates) {
    for (const key of candidates) {
        if (Array.isArray(album[key])) return album[key];
    }
    return null;
}

function pickString(album, candidates) {
    for (const key of candidates) {
        if (typeof album[key] === 'string' && album[key].trim()) return album[key].trim();
    }
    return null;
}

function findArtistArray(album) {
    const direct = pickArray(album, [
        'singerNames',
        'songSingerNames',
        'songArtists',
        'artistNames',
        'artists',
        'authors',
        'songAuthors',
        'songSingers'
    ]);
    if (direct) return direct;

    const entries = Object.entries(album).filter(([, value]) => Array.isArray(value));
    const artistLike = entries.find(([key]) => /artist|singer|author/i.test(key));
    return artistLike ? artistLike[1] : null;
}

function findCoverArray(album) {
    const direct = pickArray(album, [
        'songPics',
        'songPictures',
        'songCovers',
        'songImages',
        'covers',
        'imgs',
        'pics'
    ]);
    if (direct) return direct;

    const entries = Object.entries(album).filter(([, value]) => Array.isArray(value));
    const coverLike = entries.find(([key]) => /cover|pic|image|img/i.test(key));
    return coverLike ? coverLike[1] : null;
}

function findDurationArray(album) {
    const direct = pickArray(album, [
        'songTimes',
        'songDurations',
        'durations',
        'times'
    ]);
    if (direct) return direct;

    const entries = Object.entries(album).filter(([, value]) => Array.isArray(value));
    const durationLike = entries.find(([key]) => /time|duration|length/i.test(key));
    return durationLike ? durationLike[1] : null;
}

function normalizeTrackDuration(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value;

    const text = String(value).trim();
    if (/^\d+$/.test(text)) {
        return Number(text);
    }

    const parts = text.split(':').map((item) => Number(item));
    if (parts.every((num) => Number.isFinite(num))) {
        return parts.reduce((total, current) => total * 60 + current, 0);
    }

    return text;
}

function getAlbumTitle(album, albumIndex) {
    return pickString(album, ['title', 'name', 'albumName', 'sheetName']) || `Album ${albumIndex + 1}`;
}

function summarizeSongSheetList(songSheetList) {
    return songSheetList.map((album, albumIndex) => {
        const ids = pickArray(album, ['rids', 'songIds', 'songList']) || [];
        const types = pickArray(album, ['songFrom3', 'songFrom', 'songTypes']) || [];
        const titles = pickArray(album, ['songNames', 'songName', 'titles', 'names']) || [];
        const artists = findArtistArray(album) || [];
        const covers = findCoverArray(album) || [];
        const durations = findDurationArray(album) || [];
        const count = Math.max(ids.length, types.length, titles.length, artists.length, covers.length, durations.length);

        return {
            index: albumIndex + 1,
            title: getAlbumTitle(album, albumIndex),
            count
        };
    });
}

function filterSongSheetList(songSheetList, options) {
    const nameSet = new Set(options.albumNames);
    const indexSet = new Set(options.albumIndexes);
    if (!nameSet.size && !indexSet.size) {
        return songSheetList;
    }

    return songSheetList.filter((album, albumIndex) => {
        const title = getAlbumTitle(album, albumIndex);
        const oneBasedIndex = albumIndex + 1;
        return nameSet.has(title) || indexSet.has(oneBasedIndex);
    });
}

function flattenSongSheetList(songSheetList, key) {
    const songs = [];

    songSheetList.forEach((album, albumIndex) => {
        const ids = pickArray(album, ['rids', 'songIds', 'songList']) || [];
        const types = pickArray(album, ['songFrom3', 'songFrom', 'songTypes']) || [];
        const titles = pickArray(album, ['songNames', 'songName', 'titles', 'names']) || [];
        const artists = findArtistArray(album) || [];
        const covers = findCoverArray(album) || [];
        const durations = findDurationArray(album) || [];

        const albumTitle = getAlbumTitle(album, albumIndex);
        const albumCover = pickString(album, ['cover', 'img', 'pic']);
        const count = Math.max(ids.length, types.length, titles.length, artists.length, covers.length, durations.length);

        for (let songIndex = 0; songIndex < count; songIndex += 1) {
            const title = titles[songIndex] ?? '';
            const artist = artists[songIndex] ?? '';
            const id = ids[songIndex] ?? null;
            const type = types[songIndex] ?? null;

            songs.push({
                title: typeof title === 'string' ? title.trim() : String(title || '').trim(),
                artist: typeof artist === 'string' ? artist.trim() : String(artist || '').trim(),
                id,
                type,
                album: albumTitle,
                albumIndex,
                songIndex,
                cover: covers[songIndex] || albumCover || null,
                duration: normalizeTrackDuration(durations[songIndex])
            });
        }
    });

    return songs
        .filter((song) => song.title || song.id || song.artist)
        .map((song, index) => ({
            ...song,
            order: index + 1
        }));
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const key = (options.key || '').trim();
    if (!key) {
        throw new Error('Missing myhkw key. Please pass it explicitly with --key <your-key>.');
    }

    console.log('[export-myhkw-songs] Using provided myhkw key');
    const remoteScript = await fetchRemoteScript(key);
    const songSheetLiteral = extractAssignedExpression(remoteScript, 'songSheetList');
    const songSheetList = evaluateLiteral(songSheetLiteral, 'songSheetList.js');

    if (!Array.isArray(songSheetList)) {
        throw new Error('songSheetList is not an array');
    }

    const albumSummary = summarizeSongSheetList(songSheetList);
    if (options.listAlbums) {
        albumSummary.forEach((album) => {
            console.log(`${album.index}. ${album.title} (${album.count} songs)`);
        });
        return;
    }

    const filteredSongSheetList = filterSongSheetList(songSheetList, options);
    if (!filteredSongSheetList.length) {
        throw new Error('No playlists matched the selected album filters.');
    }

    const selectedSummary = summarizeSongSheetList(filteredSongSheetList);
    console.log(`[export-myhkw-songs] Selected playlists: ${selectedSummary.map((album) => `${album.index}. ${album.title}`).join(' | ')}`);

    const songs = flattenSongSheetList(filteredSongSheetList, key);
    await fs.writeFile(options.out, `${JSON.stringify(songs, null, 2)}\n`, 'utf8');

    console.log(`[export-myhkw-songs] Exported ${songs.length} songs to ${options.out}`);
}

main().catch((error) => {
    console.error(`[export-myhkw-songs] ${error.message}`);
    process.exit(1);
});
