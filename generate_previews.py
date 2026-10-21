import wave
import struct
import math
import random

SAMPLE_RATE = 44100

def create_snatch_preview(filename="public/audio/snatch_preview.wav", duration=25.0):
    bpm = 112.0
    beat_sec = 60.0 / bpm
    total_samples = int(duration * SAMPLE_RATE)
    
    left = [0.0] * total_samples
    right = [0.0] * total_samples
    
    # Bassline notes (funk minor pentatonic: E1, G1, A1, B1, D2)
    def midi_to_freq(m):
        return 440.0 * (2.0 ** ((m - 69.0) / 12.0))
    
    # E minor groove: E, E, G, A, E, D, E, B
    bass_notes = [40, 40, 43, 45, 40, 38, 40, 47, 40, 40, 43, 45, 47, 45, 43, 38]
    
    # Drums & percussion
    num_beats = int(duration / beat_sec)
    
    # Render drums
    for b in range(num_beats):
        beat_time = b * beat_sec
        beat_sample = int(beat_time * SAMPLE_RATE)
        
        # Kick on beats 0, 2, and syncopated upbeat before 2
        is_kick = (b % 4 == 0) or (b % 4 == 2 and (b // 4) % 2 == 1)
        if is_kick:
            # Punchy kick 120Hz -> 45Hz
            kick_len = int(0.28 * SAMPLE_RATE)
            for i in range(min(kick_len, total_samples - beat_sample)):
                t = i / SAMPLE_RATE
                f = 120.0 * math.exp(-t * 22.0) + 45.0
                env = math.exp(-t * 14.0)
                val = math.sin(2.0 * math.pi * f * t) * env * 0.75
                left[beat_sample + i] += val
                right[beat_sample + i] += val

        # Snare on beats 1 and 3 (2 & 4 in 4/4)
        if b % 2 == 1:
            snare_len = int(0.22 * SAMPLE_RATE)
            for i in range(min(snare_len, total_samples - beat_sample)):
                t = i / SAMPLE_RATE
                # Tone (180Hz) + noise burst
                tone = math.sin(2.0 * math.pi * 185.0 * t) * math.exp(-t * 25.0) * 0.4
                noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 16.0) * 0.45
                val = tone + noise
                left[beat_sample + i] += val * 0.8
                right[beat_sample + i] += val * 0.8

        # 16th note hi-hat groove
        for sub in range(4):
            hh_sample = beat_sample + int(sub * (beat_sec / 4.0) * SAMPLE_RATE)
            if hh_sample >= total_samples:
                break
            hh_len = int(0.04 * SAMPLE_RATE)
            hh_vol = 0.25 if sub == 2 else 0.14
            for i in range(min(hh_len, total_samples - hh_sample)):
                t = i / SAMPLE_RATE
                noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 80.0) * hh_vol
                # Slight stereo spread
                left[hh_sample + i] += noise * 0.7
                right[hh_sample + i] += noise * 1.1

    # Render Bassline (rich harmonics: fundamental + 2nd + 3rd + saturation)
    sixteenth_sec = beat_sec / 4.0
    num_steps = int(duration / sixteenth_sec)
    for s in range(num_steps):
        step_sample = int(s * sixteenth_sec * SAMPLE_RATE)
        # Play on certain 16th steps
        note_idx = (s // 2) % len(bass_notes)
        if s % 2 == 0 or (s % 8 == 7): # rhythmic funk pattern
            note = bass_notes[note_idx]
            freq = midi_to_freq(note)
            note_len = int(sixteenth_sec * 1.6 * SAMPLE_RATE)
            for i in range(min(note_len, total_samples - step_sample)):
                t = i / SAMPLE_RATE
                env = math.exp(-t * 7.0)
                # Harmonics
                sig = 0.55 * math.sin(2.0 * math.pi * freq * t) + \
                      0.30 * math.sin(2.0 * math.pi * freq * 2.0 * t) + \
                      0.15 * math.sin(2.0 * math.pi * freq * 3.0 * t)
                # Soft overdrive
                sig = math.tanh(sig * 1.8) * env * 0.45
                left[step_sample + i] += sig
                right[step_sample + i] += sig

    # Funky Guitar/Wurlitzer chords (Em7, Am7)
    # Stabs on offbeats
    for b in range(num_beats):
        if b % 2 == 1:
            stab_sample = int((b * beat_sec + beat_sec * 0.5) * SAMPLE_RATE)
            chord_notes = [64, 67, 71, 74] if (b // 4) % 2 == 0 else [60, 64, 67, 69]
            stab_len = int(0.18 * SAMPLE_RATE)
            for i in range(min(stab_len, total_samples - stab_sample)):
                t = i / SAMPLE_RATE
                env = math.exp(-t * 18.0)
                chord_sig = 0.0
                for n in chord_notes:
                    f = midi_to_freq(n)
                    chord_sig += math.sin(2.0 * math.pi * f * t) + 0.3 * math.sin(2.0 * math.pi * f * 2.0 * t)
                chord_sig = (chord_sig / len(chord_notes)) * env * 0.35
                left[stab_sample + i] += chord_sig * 1.1
                right[stab_sample + i] += chord_sig * 0.7

    # Normalize and write 16-bit WAV
    max_val = max(max(abs(x) for x in left), max(abs(x) for x in right), 0.001)
    scale = 32767.0 * 0.88 / max_val
    
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for i in range(total_samples):
            # Fade out last 1.5s
            fade = 1.0
            remaining = (total_samples - i) / SAMPLE_RATE
            if remaining < 1.5:
                fade = remaining / 1.5
            l_sample = int(left[i] * scale * fade)
            r_sample = int(right[i] * scale * fade)
            l_sample = max(-32768, min(32767, l_sample))
            r_sample = max(-32768, min(32767, r_sample))
            frames.extend(struct.pack('<hh', l_sample, r_sample))
        wf.writeframes(frames)
    print(f"Generated {filename} ({duration}s)")


def create_stayin_alive_preview(filename="public/audio/stayin_alive_preview.wav", duration=25.0):
    bpm = 124.0
    beat_sec = 60.0 / bpm
    total_samples = int(duration * SAMPLE_RATE)
    
    left = [0.0] * total_samples
    right = [0.0] * total_samples
    
    def midi_to_freq(m):
        return 440.0 * (2.0 ** ((m - 69.0) / 12.0))
    
    # Stayin' Alive iconic disco octave bass in F minor:
    # F1 -> F2 -> F1 -> F2 rhythm
    # F (41), Ab (44), Bb (46), C (48)
    disco_bass = [41, 53, 41, 53, 41, 53, 44, 46, 41, 53, 41, 53, 48, 46, 44, 41]
    
    num_beats = int(duration / beat_sec)
    
    # Four-on-the-floor Kick
    for b in range(num_beats):
        beat_sample = int(b * beat_sec * SAMPLE_RATE)
        kick_len = int(0.24 * SAMPLE_RATE)
        for i in range(min(kick_len, total_samples - beat_sample)):
            t = i / SAMPLE_RATE
            f = 135.0 * math.exp(-t * 26.0) + 48.0
            env = math.exp(-t * 16.0)
            val = math.sin(2.0 * math.pi * f * t) * env * 0.8
            left[beat_sample + i] += val
            right[beat_sample + i] += val
            
        # Claps / Snare on 2 and 4 (beats 1 & 3)
        if b % 2 == 1:
            clap_sample = beat_sample
            clap_len = int(0.25 * SAMPLE_RATE)
            for i in range(min(clap_len, total_samples - clap_sample)):
                t = i / SAMPLE_RATE
                noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 18.0) * 0.4
                tone = math.sin(2.0 * math.pi * 220.0 * t) * math.exp(-t * 30.0) * 0.25
                left[clap_sample + i] += (noise + tone) * 0.9
                right[clap_sample + i] += (noise + tone) * 0.9

        # Open Hi-hat on the upbeat (& of every beat)
        upbeat_sample = beat_sample + int(0.5 * beat_sec * SAMPLE_RATE)
        if upbeat_sample < total_samples:
            ohh_len = int(0.16 * SAMPLE_RATE)
            for i in range(min(ohh_len, total_samples - upbeat_sample)):
                t = i / SAMPLE_RATE
                noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 22.0) * 0.28
                left[upbeat_sample + i] += noise * 0.65
                right[upbeat_sample + i] += noise * 1.15

    # 16th note synth bassline with resonance
    sixteenth_sec = beat_sec / 4.0
    num_steps = int(duration / sixteenth_sec)
    for s in range(num_steps):
        step_sample = int(s * sixteenth_sec * SAMPLE_RATE)
        note = disco_bass[s % len(disco_bass)]
        freq = midi_to_freq(note)
        note_len = int(sixteenth_sec * 0.9 * SAMPLE_RATE)
        for i in range(min(note_len, total_samples - step_sample)):
            t = i / SAMPLE_RATE
            env = math.exp(-t * 12.0)
            # Sawtooth-like rich timbre with cutoff filter decay
            filt = math.exp(-t * 20.0) * 3.0 + 1.0
            sig = (math.sin(2.0 * math.pi * freq * t) +
                   0.5 * math.sin(2.0 * math.pi * freq * 2.0 * t * filt) +
                   0.3 * math.sin(2.0 * math.pi * freq * 3.0 * t) +
                   0.2 * math.sin(2.0 * math.pi * freq * 4.0 * t))
            sig = math.tanh(sig * 1.5) * env * 0.42
            left[step_sample + i] += sig
            right[step_sample + i] += sig

    # High Disco Strings / Brass stabs (Fm, Bb, Db, Eb chords)
    bar_sec = beat_sec * 4.0
    num_bars = int(duration / bar_sec)
    for bar in range(num_bars):
        bar_sample = int(bar * bar_sec * SAMPLE_RATE)
        # Disco brass hits on beat 1 and beat 3.5
        hit_offsets = [0.0, beat_sec * 2.5]
        for offset in hit_offsets:
            hit_sample = bar_sample + int(offset * SAMPLE_RATE)
            if hit_sample >= total_samples:
                break
            hit_len = int(0.35 * SAMPLE_RATE)
            chord = [65, 68, 72, 77] # F, Ab, C, F
            for i in range(min(hit_len, total_samples - hit_sample)):
                t = i / SAMPLE_RATE
                env = math.exp(-t * 8.0)
                sig = 0.0
                for n in chord:
                    f = midi_to_freq(n)
                    sig += math.sin(2.0 * math.pi * f * t) + 0.4 * math.sin(2.0 * math.pi * f * 2.0 * t)
                sig = (sig / len(chord)) * env * 0.32
                left[hit_sample + i] += sig * 0.8
                right[hit_sample + i] += sig * 1.2

    # Normalize and write 16-bit WAV
    max_val = max(max(abs(x) for x in left), max(abs(x) for x in right), 0.001)
    scale = 32767.0 * 0.88 / max_val
    
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for i in range(total_samples):
            fade = 1.0
            remaining = (total_samples - i) / SAMPLE_RATE
            if remaining < 1.5:
                fade = remaining / 1.5
            l_sample = int(left[i] * scale * fade)
            r_sample = int(right[i] * scale * fade)
            l_sample = max(-32768, min(32767, l_sample))
            r_sample = max(-32768, min(32767, r_sample))
            frames.extend(struct.pack('<hh', l_sample, r_sample))
        wf.writeframes(frames)
    print(f"Generated {filename} ({duration}s)")

if __name__ == "__main__":
    create_snatch_preview()
    create_stayin_alive_preview()
