"""
audio_engine.py
VoxShield Real-Time Voice Processing Engine
"""

import queue
import threading
import numpy as np
import sounddevice as sd

try:
    import noisereduce as nr
except:
    nr = None

import soundfile as sf
from scipy.signal import resample, butter, lfilter

# ===============================
# Configuration
# ===============================

latest_audio_block = None

SAMPLE_RATE = 48000
BLOCK_SIZE = 1024

INPUT_DEVICE = None
OUTPUT_DEVICE = None

privacy_strength = 5

# ===============================
# New Global Features
# ===============================

current_effect = "mask"

recording = False
recorded_frames = []

# ===============================
# Runtime State
# ===============================

running = False
_in_stream = None
_out_stream = None
_lock = threading.Lock()
_audio_q = queue.Queue(maxsize=4)

# ===============================
# Device Keywords
# ===============================

VIRTUAL_KEYWORDS = ["cable", "vb-audio", "virtual", "voicemeeter"]
CABLE_INPUT_KEYWORDS = ["cable input", "vb-audio cable"]

# ===============================
# Device Detection
# ===============================


def find_virtual_output_device():

    for idx, dev in enumerate(sd.query_devices()):

        if dev["max_output_channels"] < 1:
            continue

        name = dev["name"].lower()

        if any(k in name for k in CABLE_INPUT_KEYWORDS):
            return idx

    for idx, dev in enumerate(sd.query_devices()):

        if dev["max_output_channels"] < 1:
            continue

        name = dev["name"].lower()

        if any(k in name for k in VIRTUAL_KEYWORDS):
            return idx

    return None


def find_real_input_device():

    devices = sd.query_devices()

    default_in, _ = sd.default.device

    if default_in is not None and default_in >= 0:

        dev = devices[default_in]

        if dev["max_input_channels"] > 0:
            return default_in

    for idx, dev in enumerate(devices):

        if dev["max_input_channels"] > 0:
            return idx

    return None


def list_devices():

    return [
        {
            "index": i,
            "name": dev["name"],
            "inputs": dev["max_input_channels"],
            "outputs": dev["max_output_channels"],
        }
        for i, dev in enumerate(sd.query_devices())
    ]


def reset_devices():

    global INPUT_DEVICE, OUTPUT_DEVICE

    INPUT_DEVICE = None
    OUTPUT_DEVICE = None


def _resolve_devices():

    global INPUT_DEVICE, OUTPUT_DEVICE

    if INPUT_DEVICE is None:
        INPUT_DEVICE = find_real_input_device()

    if OUTPUT_DEVICE is None:
        OUTPUT_DEVICE = find_virtual_output_device()

# ===============================
# Effects System
# ===============================


def set_effect(effect):

    global current_effect
    current_effect = effect

    print(f"[VoxShield] Effect set -> {effect}")


# ===============================
# Noise Suppression
# ===============================

def smooth_voice(audio):

    # remove harsh frequencies
    b, a = butter(4, 3000 / (SAMPLE_RATE / 2), btype='low')

    filtered = lfilter(b, a, audio)

    return filtered


def suppress_noise(audio):

    if nr is None:
        return audio

    try:
        reduced = nr.reduce_noise(y=audio, sr=SAMPLE_RATE)
        return reduced.astype(np.float32)
    except:
        return audio
    

def speech_clarity_filter(audio):

    # keep only speech frequencies
    low = 80 / (SAMPLE_RATE / 2)
    high = 3400 / (SAMPLE_RATE / 2)

    b, a = butter(4, [low, high], btype='band')

    filtered = lfilter(b, a, audio)

    return filtered


def normalize(audio):

    max_val = np.max(np.abs(audio))

    if max_val > 0:
        audio = audio / max_val

    return audio * 0.9


# ===============================
# Voice Effects
# ===============================


def mask_voice(audio):

    factor = 1.0 + (privacy_strength * 0.02)

    n = len(audio)

    shifted = resample(audio, int(n / factor))

    if len(shifted) < n:
        shifted = np.pad(shifted, (0, n - len(shifted)))
    else:
        shifted = shifted[:n]

    return shifted * 0.95


def apply_effect(audio):

    if current_effect == "mask":
        return mask_voice(audio)
    

    if current_effect == "female":

        factor = 1.35   # pitch up

        n_in = len(audio)
        n_out = int(n_in / factor)

        pitched = resample(audio, n_out)

        if len(pitched) < n_in:
            pitched = np.pad(pitched, (0, n_in - len(pitched)))
        else:
            pitched = pitched[:n_in]

        # soften harsh frequencies
        pitched = smooth_voice(pitched)

        return pitched

    # if current_effect == "female":

    #     factor = 0.75
    #     n = len(audio)

    #     shifted = resample(audio, int(n * factor))

    #     shifted = np.pad(shifted, (0, n - len(shifted)))

    #     return shifted[:n] * 0.9


    if current_effect == "deep":

        factor = 1.25
        n = len(audio)

        shifted = resample(audio, int(n * factor))

        return shifted[:n] * 0.9


    if current_effect == "robot":

        t = np.arange(len(audio)) / SAMPLE_RATE
        carrier = np.sin(2 * np.pi * 90 * t)  # 90 Hz robotic tone
        return audio * carrier


    if current_effect == "echo":

        delay = int(0.25 * SAMPLE_RATE)   # 250 ms delay
        echo = np.zeros(len(audio))

        if delay < len(audio):
            echo[delay:] = audio[:-delay]

        return 0.7 * audio + 0.6 * echo


    if current_effect == "demon":

        factor = 1.35
        n = len(audio)

        shifted = resample(audio, int(n * factor))

        return np.tanh(shifted[:n] * 1.2)


    if current_effect == "clean":

        return audio

    return audio


# ===============================
# Identity Protection
# ===============================


def identity_protect(audio):

    # very small jitter
    jitter = np.random.normal(0, 0.0005, len(audio))

    audio = audio + jitter

    warped = resample(audio, int(len(audio) * 0.99))

    warped = np.pad(warped, (0, len(audio) - len(warped)))

    return warped[:len(audio)]


# ===============================
# Recording
# ===============================


def start_recording():

    global recording, recorded_frames

    recording = True

    recorded_frames = []

    print("[VoxShield] Recording started")


def stop_recording(filename="voxshield_recording.wav"):

    global recording

    recording = False

    if len(recorded_frames) == 0:
        return

    data = np.concatenate(recorded_frames)

    sf.write(filename, data, SAMPLE_RATE)

    print("[VoxShield] Recording saved ->", filename)


# ===============================
# AI Speech Analysis
# ===============================

speech_stats = {
    "energy": 0,
    "pitch": 0,
    "speed": 0
}

def analyze_speech(audio):

    global speech_stats

    # voice energy (loudness)
    energy = float(np.mean(audio ** 2))

    # pitch approximation
    spectrum = np.abs(np.fft.rfft(audio))
    pitch = float(np.mean(spectrum))

    # speech speed approximation
    speed = float(np.sum(np.abs(np.diff(audio))) / len(audio))

    speech_stats = {
        "energy": energy,
        "pitch": pitch,
        "speed": speed
    }

# ===============================
# Stream Callbacks
# ===============================


def _input_callback(indata, frames, time_info, status):

    mono = indata[:, 0].copy()

    if running:

        # audio = suppress_noise(mono)

        audio = mono

        audio = apply_effect(audio)
        #optional bro modify later for more effects
        audio = identity_protect(audio)

        audio = speech_clarity_filter(audio)

        analyze_speech(audio)

        # audio = normalize(audio)

        processed = audio.astype(np.float32)

        global latest_audio_block
        latest_audio_block = processed

    else:

        processed = mono

    if recording:
        recorded_frames.append(processed.copy())

    try:
        _audio_q.put_nowait(processed)

    except queue.Full:
        pass


def _output_callback(outdata, frames, time_info, status):

    try:

        block = _audio_q.get_nowait()

    except queue.Empty:

        block = np.zeros(frames, dtype=np.float32)

    for ch in range(outdata.shape[1]):
        outdata[:, ch] = block


# ===============================
# Stream Control
# ===============================

def _probe_sample_rate(device_idx, want_output=True, preferred=48000):
    """Find a sample rate supported by the device."""

    for rate in (preferred, 48000, 44100, 22050, 16000):

        try:

            if want_output:
                sd.check_output_settings(device=device_idx, samplerate=rate)
            else:
                sd.check_input_settings(device=device_idx, samplerate=rate)

            return rate

        except Exception:
            continue

    return preferred


def start_stream(input_device=None, output_device=None):

    global running, INPUT_DEVICE, OUTPUT_DEVICE

    with _lock:

        if running:
            return

        if input_device is not None:
            INPUT_DEVICE = input_device

        if output_device is not None:
            OUTPUT_DEVICE = output_device

        running = True

    _resolve_devices()

    in_dev = sd.query_devices(INPUT_DEVICE)
    out_dev = sd.query_devices(OUTPUT_DEVICE)

    # Detect compatible sample rates
    in_rate = _probe_sample_rate(INPUT_DEVICE, want_output=False)
    out_rate = _probe_sample_rate(OUTPUT_DEVICE, want_output=True)

    global SAMPLE_RATE
    SAMPLE_RATE = min(in_rate, out_rate)

    in_ch = min(1, in_dev["max_input_channels"])
    out_ch = min(2, out_dev["max_output_channels"])

    print("[VoxShield] Engine Started")

    try:

        in_stream = sd.InputStream(
            device=INPUT_DEVICE,
            channels=in_ch,
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            dtype="float32",
            callback=_input_callback,
        )

        out_stream = sd.OutputStream(
            device=OUTPUT_DEVICE,
            channels=out_ch,
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            dtype="float32",
            callback=_output_callback,
        )

        with in_stream, out_stream:

            while running:
                sd.sleep(100)

    finally:

        running = False

        print("[VoxShield] Stream stopped")


def stop_stream():

    global running

    running = False


def set_strength(value):

    global privacy_strength

    privacy_strength = max(0, min(10, int(value)))


def get_status():

    return {
        "running": running,
        "privacy_strength": privacy_strength,
        "input_device": INPUT_DEVICE,
        "output_device": OUTPUT_DEVICE,
    }

def get_speech_stats():
    return speech_stats