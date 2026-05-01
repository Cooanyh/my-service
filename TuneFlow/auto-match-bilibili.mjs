#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT = path.join(SCRIPT_DIR, 'songs.json');
const DEFAULT_OUTPUT = path.join(SCRIPT_DIR, 'songs.matched.json');
const SEARCH_PAGE_URL = 'https://search.bilibili.com/all';
const SEARCH_ALL_API_URL = 'https://api.bilibili.com/x/web-interface/search/all/v2';
const SEARCH_TYPE_API_URL = 'https://api.bilibili.com/x/web-interface/search/type';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    'user-agent': USER_AGENT,
    'accept-language': 'zh-CN,zh;q=0.9',
    referer: 'https://www.bilibili.com/'
};

configureUtf8Output();

function configureUtf8Output() {
    if (process.stdout?.setDefaultEncoding) process.stdout.setDefaultEncoding('utf8');
    if (process.stderr?.setDefaultEncoding) process.stderr.setDefaultEncoding('utf8');
}

function parseArgs(argv) {
    const options = {
        input: DEFAULT_INPUT,
        out: DEFAULT_OUTPUT,
        limit: Infinity,
        delayMs: 800,
        debug: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if ((arg === '--input' || arg === '-i') && argv[i + 1]) {
            options.input = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        } else if ((arg === '--out' || arg === '-o') && argv[i + 1]) {
            options.out = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        } else if (arg === '--limit' && argv[i + 1]) {
            options.limit = Number(argv[i + 1]) || Infinity;
            i += 1;
        } else if (arg === '--delay' && argv[i + 1]) {
            options.delayMs = Number(argv[i + 1]) || 800;
            i += 1;
        } else if (arg === '--debug') {
            options.debug = true;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp() {
    console.log(`Auto match songs.json to bilibili videos

Usage:
  node TuneFlow/auto-match-bilibili.mjs [--input songs.json] [--out songs.matched.json]

Options:
  --input, -i   Input songs.json path
  --out, -o     Output matched json path
  --limit       Only process the first N songs
  --delay       Delay in ms between requests (default: 800)
  --debug       Print search diagnostics for each song
`);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;|&#34;/g, '"')
        .replace(/&amp;|&#38;/g, '&')
        .replace(/&lt;|&#60;/g, '<')
        .replace(/&gt;|&#62;/g, '>')
        .replace(/[\u3000\s]+/g, '')
        .replace(/[^0-9a-z\u4e00-\u9fff]+/g, '')
        .trim();
}

function cleanTitle(value) {
    return String(value || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;|&#34;/g, '"')
        .replace(/&amp;|&#38;/g, '&')
        .replace(/&lt;|&#60;/g, '<')
        .replace(/&gt;|&#62;/g, '>')
        .trim();
}

function parseDuration(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value;
    const text = String(value).trim();
    if (/^\d+$/.test(text)) return Number(text);
    const parts = text.split(':').map((item) => Number(item));
    if (parts.every(Number.isFinite)) {
        return parts.reduce((sum, cur) => sum * 60 + cur, 0);
    }
    return null;
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
}

function createQueries(song) {
    const title = String(song.title || '').trim();
    const artist = String(song.artist || '').trim();
    return unique([
        [title, artist, 'MV'].filter(Boolean).join(' '),
        [title, artist].filter(Boolean).join(' '),
        [title, 'MV'].filter(Boolean).join(' '),
        title
    ]);
}

function extractInitialState(html) {
    const patterns = [
        /__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;\s*\(function/s,
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;\s*\(function/s,
        /__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/s
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
            const parsed = safeJsonParse(match[1]);
            if (parsed) return parsed;
        }
    }

    return null;
}

function findVideoCandidates(initialState) {
    if (!initialState || typeof initialState !== 'object') return [];

    const directBuckets = [
        initialState?.allData?.video,
        initialState?.searchResponse?.result,
        initialState?.data?.result
    ].filter(Array.isArray);

    for (const bucket of directBuckets) {
        const normalized = bucket.filter((item) => item && (item.bvid || item.arcurl || item.aid));
        if (normalized.length) return normalized;
    }

    const resultGroups = Array.isArray(initialState?.allData?.result) ? initialState.allData.result : [];
    for (const group of resultGroups) {
        if (group?.result_type === 'video' && Array.isArray(group?.data)) {
            return group.data;
        }
        if (group?.result_type === 'video' && Array.isArray(group?.result)) {
            return group.result;
        }
    }

    return [];
}

function normalizeCandidate(raw) {
    const pageUrl = raw.arcurl
        || (raw.bvid ? `https://www.bilibili.com/video/${raw.bvid}` : null)
        || (raw.aid ? `https://www.bilibili.com/video/av${raw.aid}` : null);

    return {
        title: cleanTitle(raw.title || raw.name || ''),
        bvid: raw.bvid || '',
        aid: raw.aid || raw.id || null,
        author: raw.author || raw.up_name || raw.uname || '',
        cover: raw.pic ? (String(raw.pic).startsWith('http') ? raw.pic : `https:${raw.pic}`) : null,
        duration: parseDuration(raw.duration),
        play: parsePlayCount(raw.play || raw.playcnt || raw.play_count || 0),
        pageUrl
    };
}

function parsePlayCount(value) {
    if (typeof value === 'number') return value;
    const text = String(value || '').replace(/,/g, '').trim();
    if (!text) return 0;
    if (/^\d+(\.\d+)?万$/u.test(text)) return Math.round(Number(text.replace('万', '')) * 10000);
    if (/^\d+(\.\d+)?亿$/u.test(text)) return Math.round(Number(text.replace('亿', '')) * 100000000);
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : 0;
}

function scoreCandidate(song, candidate) {
    const songTitleNorm = normalizeText(song.title);
    const songArtistNorm = normalizeText(song.artist);
    const titleNorm = normalizeText(candidate.title);
    const authorNorm = normalizeText(candidate.author);

    let score = 0;

    if (songTitleNorm && titleNorm.includes(songTitleNorm)) score += 6;
    if (songArtistNorm && titleNorm.includes(songArtistNorm)) score += 4;
    if (songArtistNorm && authorNorm.includes(songArtistNorm)) score += 1.5;

    if (/(mv|official|musicvideo|music video)/i.test(candidate.title)) score += 1.6;
    if (/(官方|完整版|超清|1080p)/.test(candidate.title)) score += 0.8;
    if (/(live|concert|现场|演唱会)/i.test(candidate.title)) score -= 1.5;
    if (/(cover|dj|remix|翻唱|纯音乐|伴奏)/i.test(candidate.title)) score -= 2.2;

    if (candidate.duration != null) {
        if (candidate.duration >= 90 && candidate.duration <= 480) score += 1.3;
        if (candidate.duration < 45) score -= 1.8;
        if (candidate.duration > 900) score -= 1.2;
    }

    if (candidate.play > 0) {
        score += Math.min(1.25, Math.log10(candidate.play + 1) / 6);
    }

    return Number(score.toFixed(3));
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            ...DEFAULT_HEADERS,
            accept: 'application/json, text/plain, */*'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

async function fetchText(url) {
    const response = await fetch(url, {
        headers: {
            ...DEFAULT_HEADERS,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
}

async function searchViaAllApi(query) {
    const url = new URL(SEARCH_ALL_API_URL);
    url.searchParams.set('keyword', query);
    const payload = await fetchJson(url.toString());
    if (payload?.code !== 0) {
        throw new Error(`api_all:${payload?.code ?? 'unknown'}`);
    }

    const groups = Array.isArray(payload?.data?.result) ? payload.data.result : [];
    const videoGroup = groups.find((group) => group?.result_type === 'video');
    const items = Array.isArray(videoGroup?.data) ? videoGroup.data : [];

    return {
        method: 'api_all_v2',
        query,
        rawCount: items.length,
        candidates: items.map(normalizeCandidate)
    };
}

async function searchViaTypeApi(query) {
    const url = new URL(SEARCH_TYPE_API_URL);
    url.searchParams.set('search_type', 'video');
    url.searchParams.set('keyword', query);
    url.searchParams.set('page', '1');
    const payload = await fetchJson(url.toString());
    if (payload?.code !== 0) {
        throw new Error(`api_type:${payload?.code ?? 'unknown'}`);
    }

    const items = Array.isArray(payload?.data?.result) ? payload.data.result : [];
    return {
        method: 'api_type',
        query,
        rawCount: items.length,
        candidates: items.map(normalizeCandidate)
    };
}

async function searchViaHtml(query) {
    const url = `${SEARCH_PAGE_URL}?keyword=${encodeURIComponent(query)}`;
    const html = await fetchText(url);
    const initialState = extractInitialState(html);
    const rawCandidates = findVideoCandidates(initialState);

    return {
        method: 'html_initial_state',
        query,
        rawCount: rawCandidates.length,
        candidates: rawCandidates.map(normalizeCandidate)
    };
}

function dedupeCandidates(candidates) {
    const seen = new Set();
    const output = [];

    for (const candidate of candidates) {
        const key = candidate.bvid || candidate.pageUrl || `${candidate.title}::${candidate.author}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        output.push(candidate);
    }

    return output;
}

async function searchSong(song, options) {
    const diagnostics = [];
    const queries = createQueries(song);

    for (const query of queries) {
        const attempts = [searchViaAllApi, searchViaTypeApi, searchViaHtml];

        for (const attempt of attempts) {
            try {
                const result = await attempt(query);
                const scored = dedupeCandidates(result.candidates)
                    .filter((item) => item.title && item.pageUrl)
                    .map((item) => ({
                        ...item,
                        score: scoreCandidate(song, item)
                    }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                diagnostics.push({
                    query,
                    method: result.method,
                    rawCount: result.rawCount,
                    candidateCount: scored.length,
                    topTitles: scored.slice(0, 3).map((item) => item.title)
                });

                if (scored.length > 0) {
                    return {
                        query,
                        method: result.method,
                        candidates: scored,
                        diagnostics
                    };
                }
            } catch (error) {
                diagnostics.push({
                    query,
                    method: attempt.name,
                    error: error.message
                });
            }
        }
    }

    if (options.debug) {
        for (const item of diagnostics) {
            console.log(`[debug] ${JSON.stringify(item, null, 2)}`);
        }
    }

    return {
        query: queries[0] || '',
        method: 'none',
        candidates: [],
        diagnostics
    };
}

async function enrichVideo(video) {
    if (!video?.pageUrl) return video;

    try {
        const html = await fetchText(video.pageUrl);
        const initialState = extractInitialState(html);
        const videoData = initialState?.videoData || initialState?.data?.View || null;
        const firstPage = Array.isArray(videoData?.pages) ? videoData.pages[0] : null;

        return {
            ...video,
            aid: video.aid || videoData?.aid || null,
            bvid: video.bvid || videoData?.bvid || '',
            cid: firstPage?.cid || null
        };
    } catch {
        return video;
    }
}

function buildEmbedUrl(video) {
    if (!video?.bvid || !video?.aid || !video?.cid) return null;
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

function applyMatch(song, matchResult) {
    if (!matchResult?.best) {
        return {
            ...song,
            matchStatus: 'pending',
            needsReview: true,
            matchMeta: {
                query: matchResult?.query || '',
                method: matchResult?.method || 'none',
                confidence: 'low',
                score: 0,
                reason: matchResult?.reason || 'no_candidates',
                diagnostics: matchResult?.diagnostics || []
            }
        };
    }

    const best = matchResult.best;
    const confidence = best.score >= 8 ? 'high' : best.score >= 5.5 ? 'medium' : 'low';

    return {
        ...song,
        matchStatus: 'matched',
        needsReview: confidence !== 'high',
        matchMeta: {
            query: matchResult.query,
            method: matchResult.method,
            confidence,
            score: best.score,
            reason: confidence === 'high' ? 'auto_accept' : 'needs_review',
            diagnostics: matchResult.diagnostics || []
        },
        video: {
            source: best.pageUrl || best.bvid,
            bvid: best.bvid || '',
            aid: best.aid || null,
            cid: best.cid || null,
            title: best.title,
            author: best.author,
            cover: best.cover,
            duration: best.duration,
            pageUrl: best.pageUrl,
            embedUrl: buildEmbedUrl(best),
            candidates: matchResult.candidates.map((candidate) => ({
                title: candidate.title,
                bvid: candidate.bvid,
                aid: candidate.aid,
                cid: candidate.cid || null,
                score: candidate.score,
                pageUrl: candidate.pageUrl
            }))
        }
    };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const songs = JSON.parse(await fs.readFile(options.input, 'utf8'));

    if (!Array.isArray(songs) || songs.length === 0) {
        throw new Error('Input songs.json does not contain a song array.');
    }

    const targetSongs = songs.slice(0, options.limit);
    const output = [];

    console.log(`[auto-match] Input: ${options.input}`);
    console.log(`[auto-match] Output: ${options.out}`);
    console.log(`[auto-match] Songs to process: ${targetSongs.length}`);

    for (let i = 0; i < targetSongs.length; i += 1) {
        const song = targetSongs[i];
        const label = `${i + 1}/${targetSongs.length} ${song.title || '(untitled)'} - ${song.artist || '-'}`;
        console.log(`[auto-match] Searching ${label}`);

        try {
            const searchResult = await searchSong(song, options);
            const enrichedCandidates = [];

            for (const candidate of searchResult.candidates) {
                enrichedCandidates.push(await enrichVideo(candidate));
                await sleep(250);
            }

            const best = enrichedCandidates[0] || null;
            const matchedSong = applyMatch(song, {
                query: searchResult.query,
                method: searchResult.method,
                best,
                candidates: enrichedCandidates,
                diagnostics: searchResult.diagnostics,
                reason: best ? 'matched' : 'no_candidates'
            });

            output.push(matchedSong);

            if (best) {
                console.log(`[auto-match] -> ${best.bvid || best.pageUrl} (${searchResult.method}, score ${best.score})`);
            } else {
                console.log('[auto-match] -> no match');
                if (options.debug) {
                    for (const item of searchResult.diagnostics) {
                        console.log(`[debug] ${JSON.stringify(item, null, 2)}`);
                    }
                }
            }
        } catch (error) {
            output.push({
                ...song,
                matchStatus: 'pending',
                needsReview: true,
                matchMeta: {
                    query: createQueries(song)[0] || '',
                    method: 'error',
                    confidence: 'low',
                    score: 0,
                    reason: `error:${error.message}`,
                    diagnostics: []
                }
            });
            console.log(`[auto-match] -> error: ${error.message}`);
        }

        await sleep(options.delayMs);
    }

    const matchedCount = output.filter((song) => song.matchStatus === 'matched').length;
    const reviewCount = output.filter((song) => song.needsReview).length;

    await fs.writeFile(options.out, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`[auto-match] Done. matched=${matchedCount}, needsReview=${reviewCount}`);
}

main().catch((error) => {
    console.error(`[auto-match] ${error.message}`);
    process.exit(1);
});
