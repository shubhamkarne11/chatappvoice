# voice-ai-server/models/preprocessing.py

import librosa
import numpy as np

def apply_preprocessing(audio_data, sr, pitch_steps=4):
    """
    Apply preprocessing to audio:
    - Pitch shifting
    - Noise reduction
    - Filters
    """
    # Pitch shift
    audio_shifted = librosa.effects.pitch_shift(
        audio_data, 
        sr=sr, 
        n_steps=pitch_steps
    )
    
    # Pre-emphasis filter (high-pass)
    audio_filtered = librosa.effects.preemphasis(audio_shifted)
    
    # Normalize audio
    audio_normalized = librosa.util.normalize(audio_filtered)
    
    return audio_normalized
