#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT = path.join(SCRIPT_DIR, 'songs.matched.json');
const DEFAULT_OUTPUT = path.join(SCRIPT_DIR, 'songs.player-map.json');
const DEFAULT_SCRIPT_OUTPUT = path.join(SCRIPT_DIR, 'songs.player-map.js');

function parseArgs(argv) {
    const options = {
        input: DEFAULT_INPUT,
        out: DEFAULT_OUTPUT,
        scriptOut: DEFAULT_SCRIPT_OUTPUT
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if ((arg === '--input' || arg === '-i') && argv[i + 1]) {
            options.input = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        } else if ((arg === '--out' || arg === '-o') && argv[i + 1]) {
            options.out = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        } else if (arg === '--script-out' && argv[i + 1]) {
            options.scriptOut = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp() {
    console.log(`Export player-ready map from songs.matched.json

Usage:
  node TuneFlow/export-player-map.mjs [--input songs.matched.json] [--out songs.player-map.json]

Options:
  --input, -i   Input matched json path
  --out, -o     Output player map json path
  --script-out  Output player map js path
`);
}

function normalizeSongKey(title, artist) {
    return [title || '', artist || '']
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
        .join('::');
}

function buildEmbedUrl(video) {
    if (!video?.bvid || !video?.aid || !video?.cid) return video?.embedUrl || '';
    const params = new URLSearchParams({
        aid: String(video.aid),
        bvid: video.bvid,
        cid: String(video.cid),
        page: '1',
        autoplay: '1',
        muted: '1',
        danmaku: '0',
        high_quality: '1',
        as_wide: '1',
        allowfullscreen: '1'
    });
    return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function buildVideoPayload(song) {
    const video = song?.video || {};

    return {
        bvid: video.bvid || '',
        aid: video.aid ?? null,
        cid: video.cid ?? null,
        pageUrl: video.pageUrl || '',
        embedUrl: buildEmbedUrl(video),
        cover: video.cover || song.cover || '',
        title: video.title || '',
        author: video.author || '',
        duration: video.duration ?? null,
        source: video.source || ''
    };
}

function toMapEntry(song) {
    const songKey = normalizeSongKey(song.title, song.artist);
    return {
        songKey,
        order: song.order ?? null,
        title: song.title || '',
        artist: song.artist || '',
        album: song.album || '',
        status: song.matchStatus || 'pending',
        needsReview: Boolean(song.needsReview),
        confidence: song.matchMeta?.confidence || '',
        score: song.matchMeta?.score ?? null,
        video: buildVideoPayload(song)
    };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const songs = JSON.parse(await fs.readFile(options.input, 'utf8'));

    if (!Array.isArray(songs) || songs.length === 0) {
        throw new Error('Input songs.matched.json does not contain a song array.');
    }

    const entries = songs
        .map(toMapEntry)
        .filter((entry) => entry.songKey && (entry.video.bvid || entry.video.pageUrl || entry.video.embedUrl));

    const bySongKey = {};
    for (const entry of entries) {
        bySongKey[entry.songKey] = entry;
    }

    const output = {
        version: 1,
        generatedAt: new Date().toISOString(),
        sourceFile: path.basename(options.input),
        totalSongs: songs.length,
        mappedSongs: entries.length,
        reviewSongs: entries.filter((entry) => entry.needsReview).length,
        bySongKey
    };

    await fs.writeFile(options.out, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    await fs.writeFile(
        options.scriptOut,
        `window.__TUNEFLOW_PLAYER_MAP__ = ${JSON.stringify(output, null, 2)};\n`,
        'utf8'
    );

    console.log(`[player-map] Input: ${options.input}`);
    console.log(`[player-map] Output: ${options.out}`);
    console.log(`[player-map] Script: ${options.scriptOut}`);
    console.log(`[player-map] Mapped songs: ${entries.length}/${songs.length}`);
    console.log(`[player-map] Needs review: ${output.reviewSongs}`);
}

main().catch((error) => {
    console.error(`[player-map] ${error.message}`);
    process.exit(1);
});
