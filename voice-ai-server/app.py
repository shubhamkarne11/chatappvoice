# voice-ai-server/app.py

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import librosa
import soundfile as sf
import numpy as np
from cryptography.fernet import Fernet
import io
import os
import shutil
import subprocess
import tempfile
from models.preprocessing import apply_preprocessing
from models.voice_masking import apply_voice_masking

app = Flask(__name__)
CORS(app)

# Check for ffmpeg and set up path
def find_ffmpeg():
    """Find ffmpeg executable in PATH or common locations"""
    # First try to find in PATH
    ffmpeg_path = shutil.which('ffmpeg')
    if ffmpeg_path:
        print(f"✅ Found ffmpeg in PATH at: {ffmpeg_path}")
        return ffmpeg_path
    
    # Common Windows locations (including WinGet installation)
    import glob
    user_profile = os.path.expanduser('~')
    
    # First, try to search in WinGet Packages directory (recursive search)
    winget_packages_dir = os.path.join(user_profile, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages')
    if os.path.exists(winget_packages_dir):
        # Search recursively for ffmpeg.exe in any subdirectory
        search_pattern = os.path.join(winget_packages_dir, '**', 'ffmpeg.exe')
        matches = glob.glob(search_pattern, recursive=True)
        if matches:
            # Filter for actual ffmpeg.exe files that exist
            valid_matches = [m for m in matches if os.path.exists(m) and os.path.isfile(m)]
            if valid_matches:
                # Sort to get the most recent version (longer paths usually mean newer)
                valid_matches.sort(key=len, reverse=True)
                ffmpeg_path = valid_matches[0]
                print(f"✅ Found ffmpeg at: {ffmpeg_path}")
                return ffmpeg_path
    
    # Other common locations
    common_paths = [
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            print(f"✅ Found ffmpeg at: {path}")
            return path
    
    print("⚠️  ffmpeg not found in PATH or common locations")
    print(f"   Searched in: {user_profile}\\AppData\\Local\\Microsoft\\WinGet\\Packages\\")
    return None

# Set up ffmpeg path for pydub
FFMPEG_PATH = find_ffmpeg()
if FFMPEG_PATH:
    # Verify ffmpeg actually exists and is executable
    if not os.path.exists(FFMPEG_PATH):
        print(f"⚠️  ffmpeg path found but file doesn't exist: {FFMPEG_PATH}")
        FFMPEG_PATH = None
    else:
        # Set environment variable for pydub and subprocess
        ffmpeg_dir = os.path.dirname(FFMPEG_PATH)
        os.environ['PATH'] = ffmpeg_dir + os.pathsep + os.environ.get('PATH', '')
        
        # Also set for pydub explicitly by patching the which function
        try:
            import pydub.utils
            # Patch pydub's which function to return our ffmpeg path
            original_which = pydub.utils.which
            
            def patched_which(program):
                if program == 'ffmpeg':
                    return FFMPEG_PATH
                # For other programs, use original function
                result = original_which(program)
                # If not found and it's ffprobe, try to find it in same directory
                if not result and program == 'ffprobe':
                    ffprobe_path = os.path.join(ffmpeg_dir, 'ffprobe.exe')
                    if os.path.exists(ffprobe_path):
                        return ffprobe_path
                return result
            
            pydub.utils.which = patched_which
            print(f"✅ Configured pydub to use ffmpeg at: {FFMPEG_PATH}")
            
            # Test ffmpeg
            try:
                result = subprocess.run([FFMPEG_PATH, '-version'], 
                                      capture_output=True, 
                                      timeout=5,
                                      text=True)
                if result.returncode == 0:
                    version_line = result.stdout.split('\n')[0]
                    print(f"✅ ffmpeg is working: {version_line}")
                else:
                    print(f"⚠️  ffmpeg test failed with return code: {result.returncode}")
            except Exception as test_error:
                print(f"⚠️  Could not test ffmpeg: {test_error}")
        except Exception as e:
            print(f"⚠️  Could not configure pydub: {e}")
else:
    print("⚠️  WARNING: ffmpeg not found. WebM/MP3 conversion will not work.")
    print("   Please install ffmpeg and add it to PATH, or restart your terminal/server.")

# Generate encryption key (in production, store securely)
ENCRYPTION_KEY = Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

def convert_to_wav_with_ffmpeg(input_bytes, original_filename):
    """
    Convert audio bytes to WAV using native ffmpeg subprocess.
    Returns bytes of the WAV file.
    """
    if not FFMPEG_PATH:
        raise Exception("ffmpeg not found, cannot convert audio")

    # Create temp files
    ext = original_filename.split('.')[-1] if '.' in original_filename else 'webm'
    
    with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as input_tmp:
        input_tmp.write(input_bytes)
        input_path = input_tmp.name
        
    output_path = input_path + '.wav'
    
    try:
        # Run ffmpeg
        # -y: overwrite output
        # -ac 1: mono (optional, but good for voice)
        cmd = [
            FFMPEG_PATH, 
            '-y', 
            '-i', input_path,
            '-ac', '1',      # Force mono
            '-ar', '22050',  # Force 22050Hz sample rate (standard for voice/librosa defaults)
            output_path
        ]
        
        print(f"🔄 Running native ffmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ ffmpeg failed: {result.stderr}")
            raise Exception(f"ffmpeg conversion failed: {result.stderr}")
            
        if not os.path.exists(output_path):
            raise Exception("ffmpeg ran but output file not created")
            
        with open(output_path, 'rb') as f:
            wav_bytes = f.read()
            
        print(f"✅ Converted to WAV via native ffmpeg: {len(wav_bytes)} bytes")
        return wav_bytes
        
    finally:
        # Cleanup
        try:
            if os.path.exists(input_path): os.unlink(input_path)
            if os.path.exists(output_path): os.unlink(output_path)
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "message": "Voice AI Masking Server Running",
        "version": "1.0.0"
    })

@app.route('/api/process-voice', methods=['POST'])
def process_voice():
    try:
        print("=" * 50)
        print("🎤 Received voice processing request")
        print("=" * 50)
        
        # Get audio file from request
        if 'audio_file' not in request.files:
            print("❌ No audio file provided")
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio_file']
        print(f"📎 Audio file received: {audio_file.filename}, Content-Type: {audio_file.content_type}")
        
        # Get options
        pitch_shift_enabled = request.form.get('pitch_shift', 'true') == 'true'
        pitch_steps = int(request.form.get('pitch_steps', 4))
        use_ai_masking = request.form.get('use_ai_masking', 'true') == 'true'
        encrypt = request.form.get('encrypt', 'true') == 'true'
        
        print(f"⚙️  Options: pitch_shift={pitch_shift_enabled}, pitch_steps={pitch_steps}, ai_masking={use_ai_masking}, encrypt={encrypt}")
        
        # Load audio
        print("🔄 Loading audio file...")
        audio_bytes = audio_file.read()
        print(f"📊 Audio file size: {len(audio_bytes)} bytes")
        
        # Check file format and convert if needed
        file_extension = audio_file.filename.split('.')[-1].lower() if audio_file.filename else 'webm'
        print(f"📎 File extension: {file_extension}")
        
        # Formats that librosa/soundfile can handle directly
        soundfile_formats = ['wav', 'flac', 'ogg']
        
        audio_data = None
        sr = None
        
        # If webm/mp3/m4a, we MUST convert first (soundfile can't handle these)
        if file_extension in ['webm', 'mp3', 'm4a', 'mp4', 'aac']:
            print(f"🔄 Detected {file_extension} format - converting to WAV with native ffmpeg...")
            
            try:
                converted_bytes = convert_to_wav_with_ffmpeg(audio_bytes, audio_file.filename)
                
                # Use soundfile directly to avoid librosa -> audioread dependency
                # ffmpeg already ensured it's a WAV with 22050Hz mono
                audio_data, sr = sf.read(io.BytesIO(converted_bytes))
                print(f"✅ Audio loaded with soundfile: {len(audio_data)} samples at {sr}Hz sample rate")
                
            except Exception as e:
                print(f"❌ Conversion/Loading failed: {str(e)}")
                raise Exception(f"Could not convert/load audio: {str(e)}")
        
        else:
            # For WAV, FLAC, OGG - try librosa directly
            print("🔄 Trying librosa.load directly...")
            try:
                audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=None)
                print(f"✅ Audio loaded with librosa: {len(audio_data)} samples at {sr}Hz sample rate")
            except Exception as load_error:
                print(f"❌ librosa.load failed: {load_error}")
                raise Exception(f"Could not load {file_extension} file: {str(load_error)}")
        
        if audio_data is None or sr is None:
            raise Exception("Failed to load audio data - no valid audio could be extracted")
        
        # Step 1: Preprocessing (pitch shift, filters)
        if pitch_shift_enabled:
            print("🔄 Applying preprocessing (pitch shift)...")
            audio_data = apply_preprocessing(
                audio_data, 
                sr, 
                pitch_steps=pitch_steps
            )
            print("✅ Preprocessing complete")
        
        # Step 2: AI Voice Masking (if enabled)
        if use_ai_masking:
            print("🔄 Applying AI voice masking...")
            audio_data = apply_voice_masking(audio_data, sr)
            print("✅ AI masking complete")
        
        # Save processed audio to bytes
        print("🔄 Saving processed audio...")
        output_buffer = io.BytesIO()
        sf.write(output_buffer, audio_data, sr, format='WAV')
        output_buffer.seek(0)
        
        processed_audio = output_buffer.read()
        print(f"📊 Processed audio size: {len(processed_audio)} bytes")
        
        # Step 3: Encrypt if requested
        if encrypt:
            print("🔐 Encrypting audio...")
            processed_audio = cipher_suite.encrypt(processed_audio)
            print(f"📊 Encrypted audio size: {len(processed_audio)} bytes")
            print("✅ Voice processing complete! Sending encrypted file...")
            return send_file(
                io.BytesIO(processed_audio),
                mimetype='application/octet-stream',
                as_attachment=True,
                download_name='masked_voice.enc'
            )
        
        print("✅ Voice processing complete! Sending file...")
        return send_file(
            io.BytesIO(processed_audio),
            mimetype='audio/wav',
            as_attachment=True,
            download_name='masked_voice.wav'
        )
        
    except Exception as e:
        import traceback
        print(f"❌ Error processing voice: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/api/decrypt-voice', methods=['POST'])
def decrypt_voice():
    try:
        if 'encrypted_file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        encrypted_file = request.files['encrypted_file']
        encrypted_data = encrypted_file.read()
        
        # Decrypt
        decrypted_data = cipher_suite.decrypt(encrypted_data)
        
        return send_file(
            io.BytesIO(decrypted_data),
            mimetype='audio/wav',
            as_attachment=True,
            download_name='decrypted_voice.wav'
        )
        
    except Exception as e:
        print(f"Error decrypting voice: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-key', methods=['GET'])
def get_key():
    """Get encryption key for client"""
    return jsonify({"key": ENCRYPTION_KEY.decode()})

if __name__ == '__main__':
    print("=" * 50)
    print("🎤 Voice AI Masking Server Starting...")
    print("=" * 50)
    print("Server running on: http://0.0.0.0:8000")
    print("Health check: http://localhost:8000/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=8000, debug=True)
