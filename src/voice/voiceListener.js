const {
    joinVoiceChannel,
    EndBehaviorType,
    VoiceConnectionStatus,
    entersState,
} = require("@discordjs/voice");
const prism = require("prism-media");
const https = require("https");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

// ── Constants ──────────────────────────────────────
const SILENCE_THRESHOLD_MS = 2500;
const MAX_LISTEN_MS = 15000;
const MIN_LISTEN_MS = 1000;
const SAMPLE_RATE = 48000;
const TARGET_RATE = 16000;
const CHANNELS = 2;
const TARGET_CHANNELS = 1;
const DEBUG_SAVE_WAV = true;

/**
 * Listen to a user's voice in a Discord voice channel and transcribe it.
 */
async function listenToUser(guild, voiceChannel, userId) {
    const witToken = process.env.WIT_TOKEN_1 || process.env.WIT_TOKEN_2;
    if (!witToken) {
        throw new Error("API Error");
    }

    let connection;
    try {
        logger.info(`[Voice] Joining VC for voice capture in guild ${guild.id}`);

        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
        } catch {
            try {
                await entersState(connection, VoiceConnectionStatus.Signalling, 5_000);
                await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
            } catch {
                throw new Error("Could not establish voice connection. Try again!");
            }
        }

        logger.info("[Voice] Connection ready — speak now!");

        // ── Record using prism-media Opus decoder ───────
        const pcmBuffer = await recordWithPrismDecoder(connection, userId);

        if (!pcmBuffer || pcmBuffer.length === 0) {
            logger.warn("[Voice] No audio captured");
            return null;
        }

        // ── Check audio duration ────────────────────────
        // 48000 Hz * 2 channels * 2 bytes = 192000 bytes/sec
        // Less than 0.5s (96000 bytes) is usually noise or a decoder error
        if (pcmBuffer.length < 96000) {
            logger.warn(`[Voice] Audio too short (${pcmBuffer.length} bytes), ignoring to save API quota`);
            return null;
        }

        // ── Check audio level ───────────────────────────
        const rms = calculateRMS(pcmBuffer);
        logger.info(`[Voice] PCM size: ${pcmBuffer.length}, RMS: ${rms.toFixed(0)}`);

        if (rms < 50) {
            logger.warn("[Voice] Audio too quiet — mostly silence");
            return null;
        }

        // ── Stereo → Mono ───────────────────────────────
        const monoBuffer = stereoToMono(pcmBuffer);

        // ── Downsample 48kHz → 16kHz ────────────────────
        const downsampled = downsample(monoBuffer, SAMPLE_RATE, TARGET_RATE);

        // ── Normalize volume ────────────────────────────
        const normalized = normalizeAudio(downsampled);

        // ── Convert to WAV ──────────────────────────────
        const wavBuffer = pcmToWav(normalized, TARGET_RATE, TARGET_CHANNELS);
        logger.info(`[Voice] Final WAV: ${wavBuffer.length} bytes`);

        // ── Debug: save WAV locally ─────────────────────
        if (DEBUG_SAVE_WAV) {
            try {
                const debugDir = path.join(__dirname, "../../outputs");
                if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
                const debugPath = path.join(debugDir, `voice_debug_${Date.now()}.wav`);
                fs.writeFileSync(debugPath, wavBuffer);
                logger.info(`[Voice] Debug WAV: ${debugPath}`);
            } catch {}
        }

        // ── Transcribe ──────────────────────────────────
        let text = await transcribeWithWitAi(wavBuffer, process.env.WIT_TOKEN_1);
        if (!text && process.env.WIT_TOKEN_2) {
            logger.warn("[Voice] Primary Wit.ai token failed or empty result. Retrying with fallback...");
            text = await transcribeWithWitAi(wavBuffer, process.env.WIT_TOKEN_2);
        }
        
        logger.info(`[Voice] Result: "${text || "(nothing)"}"`);

        return text;
    } catch (err) {
        logger.error("[Voice] Error:", err.message);
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try { connection.destroy(); } catch {}
            logger.info("[Voice] Connection destroyed");
        }
    }
}

/**
 * Record audio using prism-media's streaming Opus decoder.
 * This properly decodes Discord's Opus packets to PCM via a Node.js stream pipeline.
 * Returns a Buffer of signed 16-bit LE stereo PCM at 48kHz.
 */
function recordWithPrismDecoder(connection, userId) {
    return new Promise((resolve) => {
        const receiver = connection.receiver;
        const pcmChunks = [];
        let hasData = false;
        let silenceTimer = null;
        let resolved = false;
        let maxTimer;
        const startTime = Date.now();

        const finish = (reason) => {
            if (resolved) return;
            resolved = true;
            if (silenceTimer) clearTimeout(silenceTimer);
            if (maxTimer) clearTimeout(maxTimer);
            try { opusStream.destroy(); } catch {}
            try { if (opusDecoder) opusDecoder.delete(); } catch {}

            if (!hasData || pcmChunks.length === 0) {
                logger.warn(`[Voice] No voice data (${reason})`);
                resolve(null);
                return;
            }

            const result = Buffer.concat(pcmChunks);
            const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
            logger.info(`[Voice] Recorded ${result.length} bytes PCM in ${durationSec}s (${reason})`);
            resolve(result);
        };

        // Subscribe to the user's Opus audio stream
        const opusStream = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.Manual },
        });

        // We use opusscript directly instead of prism-media's Decoder stream
        // This allows us to catch decode errors per-packet and ignore them,
        // rather than the stream crashing and aborting the entire recording.
        let opusDecoder;
        try {
            const OpusScript = require("opusscript");
            // 48000 Hz, 2 channels, application AUDIO
            opusDecoder = new OpusScript(SAMPLE_RATE, CHANNELS, OpusScript.Application.AUDIO);
        } catch (e) {
            logger.error("[Voice] OpusScript is missing! Ensure it is installed.");
            resolve(null);
            return;
        }

        logger.info(`[Voice] 🎤 Listening to user ${userId}...`);

        opusStream.on("data", (chunk) => {
            if (chunk.length < 5) return; // Drop known Discord silent frames

            try {
                // Decode Opus to PCM manually
                const pcmChunk = opusDecoder.decode(chunk);

                hasData = true;
                pcmChunks.push(pcmChunk);

                // Reset silence timer on each valid PCM chunk
                if (silenceTimer) clearTimeout(silenceTimer);

                const elapsed = Date.now() - startTime;
                if (elapsed >= MIN_LISTEN_MS) {
                    silenceTimer = setTimeout(() => {
                        finish("silence detected");
                    }, SILENCE_THRESHOLD_MS);
                }
            } catch (err) {
                // We IGNORE individual packet decoding errors (often "Invalid packet" from glitches)
                // so the stream stays alive and captures the rest of the user's speech!
            }
        });

        opusStream.on("end", () => {
            finish("opus stream ended");
        });

        opusStream.on("error", (err) => {
            logger.error("[Voice] Opus stream error:", err.message);
        });

        opusStream.on("close", () => {
            setTimeout(() => finish("opus stream closed"), 200);
        });

        // Max recording safety
        maxTimer = setTimeout(() => {
            finish("max duration");
        }, MAX_LISTEN_MS);
    });
}

// ────────────────────────────────────────────────────
// Audio Processing Utilities
// ────────────────────────────────────────────────────

function calculateRMS(pcmBuffer) {
    const sampleCount = pcmBuffer.length / 2;
    if (sampleCount === 0) return 0;
    let sum = 0;
    for (let i = 0; i < sampleCount; i++) {
        const s = pcmBuffer.readInt16LE(i * 2);
        sum += s * s;
    }
    return Math.sqrt(sum / sampleCount);
}

function normalizeAudio(pcmBuffer) {
    const samples = pcmBuffer.length / 2;
    if (samples === 0) return pcmBuffer;

    let maxAmp = 0;
    for (let i = 0; i < samples; i++) {
        const abs = Math.abs(pcmBuffer.readInt16LE(i * 2));
        if (abs > maxAmp) maxAmp = abs;
    }

    if (maxAmp === 0 || maxAmp > 25000) return pcmBuffer;

    const target = 28000;
    const gain = Math.min(target / maxAmp, 20); // Cap gain at 20x to avoid extreme amplification
    const out = Buffer.alloc(pcmBuffer.length);

    for (let i = 0; i < samples; i++) {
        const s = pcmBuffer.readInt16LE(i * 2);
        out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * gain))), i * 2);
    }

    logger.info(`[Voice] Normalized: peak ${maxAmp} → ~${Math.round(maxAmp * gain)} (${gain.toFixed(1)}x gain)`);
    return out;
}

function stereoToMono(stereoBuffer) {
    const frames = stereoBuffer.length / 4;
    const mono = Buffer.alloc(frames * 2);
    for (let i = 0; i < frames; i++) {
        const left = stereoBuffer.readInt16LE(i * 4);
        const right = stereoBuffer.readInt16LE(i * 4 + 2);
        mono.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round((left + right) / 2))), i * 2);
    }
    return mono;
}

function downsample(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const inSamples = buffer.length / 2;
    const outSamples = Math.floor(inSamples / ratio);
    const out = Buffer.alloc(outSamples * 2);
    for (let i = 0; i < outSamples; i++) {
        const srcIdx = Math.min(Math.floor(i * ratio), inSamples - 1);
        out.writeInt16LE(buffer.readInt16LE(srcIdx * 2), i * 2);
    }
    return out;
}

function pcmToWav(pcm, rate, ch) {
    const bps = 16;
    const byteRate = rate * ch * (bps / 8);
    const blockAlign = ch * (bps / 8);
    const hdr = 44;
    const wav = Buffer.alloc(hdr + pcm.length);

    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + pcm.length, 4);
    wav.write("WAVE", 8);
    wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(ch, 22);
    wav.writeUInt32LE(rate, 24);
    wav.writeUInt32LE(byteRate, 28);
    wav.writeUInt16LE(blockAlign, 32);
    wav.writeUInt16LE(bps, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(pcm.length, 40);
    pcm.copy(wav, hdr);

    return wav;
}

// ────────────────────────────────────────────────────
// Wit.ai Audio Transcription
// ────────────────────────────────────────────────────

async function transcribeWithWitAi(wavBuffer, token) {
    if (!token) return null;
    
    return new Promise((resolve, reject) => {
        logger.info(`[Voice] Sending ${wavBuffer.length} bytes to Wit.ai...`);

        const options = {
            hostname: 'api.wit.ai',
            path: '/speech?v=20240304',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'audio/wav',
                'Content-Length': wavBuffer.length,
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk.toString();
            });

            res.on('end', () => {
                try {
                    let finalRecognizedText = null;
                    try {
                        const jsonArrStr = '[' + data.trim().replace(/}\s*\{/g, '},{') + ']';
                        const chunks = JSON.parse(jsonArrStr);

                        for (const chunk of chunks) {
                            if ((chunk.type === "FINAL_TRANSCRIPTION" || chunk.is_final) && chunk.text) {
                                finalRecognizedText = chunk.text;
                                break;
                            } else if (chunk.text) {
                                finalRecognizedText = chunk.text;
                            }
                        }
                    } catch (err) {
                        try {
                            const lines = data.split('\n');
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;
                                const parsed = JSON.parse(trimmed);
                                if ((parsed.type === "FINAL_TRANSCRIPTION" || parsed.is_final) && parsed.text) {
                                    finalRecognizedText = parsed.text;
                                    break;
                                } else if (parsed.text) {
                                    finalRecognizedText = parsed.text;
                                }
                            }
                        } catch (e) {
                            const matches = data.match(/"text"\s*:\s*"([^"]+)"/g);
                            if (matches && matches.length > 0) {
                                const last = matches[matches.length - 1];
                                finalRecognizedText = last.replace(/"text"\s*:\s*"/, '').replace(/"$/, '');
                            }
                        }
                    }

                    const result = finalRecognizedText ? finalRecognizedText.trim() : null;
                    resolve(result);
                } catch (err) {
                    logger.error(`[Voice] Wit.ai parse error: ${err.message}`);
                    resolve(null);
                }
            });
        });

        req.on('error', (err) => {
            logger.error(`[Voice] Wit.ai network error: ${err.message}`);
            resolve(null);
        });

        // Send the WAV data
        req.write(wavBuffer);
        req.end();
    });
}

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

function cleanRecognizedText(text) {
    if (!text) return null;
    const cleaned = text.trim();
    const prefixes = [
        /^play\s+/i, /^please play\s+/i, /^can you play\s+/i,
        /^put on\s+/i, /^i want to hear\s+/i, /^i want to listen to\s+/i,
        /^search for\s+/i, /^find\s+/i, /^search\s+/i,
    ];
    for (const p of prefixes) {
        if (cleaned.match(p)) return cleaned.replace(p, "").trim();
    }
    return cleaned;
}

function savePlayerState(player) {
    if (!player) return null;
    return {
        currentTrack: player.queue.current,
        queueTracks: [...player.queue],
        position: player.shoukaku?.position || 0,
        volume: player.volume,
        loop: player.loop || "none",
        voiceId: player.voiceId,
        textId: player.textId,
        is247: player.data?.get("247") || false,
    };
}

async function restorePlayerState(client, guildId, savedState) {
    if (!savedState) return null;
    await new Promise(r => setTimeout(r, 1200));

    const player = await client.manager.createPlayer({
        guildId, voiceId: savedState.voiceId, textId: savedState.textId,
        deaf: false, volume: savedState.volume,
    });

    if (savedState.loop !== "none") player.setLoop(savedState.loop);
    if (savedState.is247) {
        if (!player.data) player.data = new Map();
        player.data.set("247", true);
    }
    if (savedState.currentTrack) player.queue.add(savedState.currentTrack);
    for (const t of savedState.queueTracks) player.queue.add(t);

    if (player.queue.length > 0 || player.queue.current) {
        player.play();
        if (savedState.position > 0) {
            setTimeout(() => { try { player.seek(savedState.position); } catch {} }, 1500);
        }
    }

    return player;
}

module.exports = {
    listenToUser, savePlayerState, restorePlayerState, cleanRecognizedText,
    SILENCE_THRESHOLD_MS, MAX_LISTEN_MS,
};
