# voice-ai-server/models/voice_masking.py

import numpy as np
import librosa

def apply_voice_masking(audio_data, sr):
    """
    Apply AI-based voice masking
    For now, using signal processing
    (Later can integrate PyTorch models like AutoVC)
    """
    # Apply formant shifting (vocal tract modification)
    audio_masked = librosa.effects.pitch_shift(
        audio_data, 
        sr=sr, 
        n_steps=-2  # Slight downshift
    )
    
    # Add subtle noise for privacy
    noise = np.random.normal(0, 0.005, audio_masked.shape)
    audio_masked = audio_masked + noise
    
    # Normalize
    audio_masked = librosa.util.normalize(audio_masked)
    
    return audio_masked
