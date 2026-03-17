import os
import urllib.request
import zipfile
import subprocess
import platform
import sounddevice as sd

VB_URL = "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip"


def is_vbcable_installed():
    """Check if VB-Audio Cable exists in system audio devices."""
    try:
        devices = sd.query_devices()
        for dev in devices:
            name = dev["name"].lower()
            if "cable input" in name or "vb-audio" in name:
                return True
    except Exception:
        pass
    return False


def install_vbcable():

    if platform.system() != "Windows":
        return

    # 🔎 Check if driver already installed
    if is_vbcable_installed():
        print("[VoiceMask] VB-Audio Cable already installed ✔")
        return

    print("[VoiceMask] VB Cable not found. Installing...")

    zip_file = "vbcable.zip"

    print("[VoiceMask] Downloading driver...")
    urllib.request.urlretrieve(VB_URL, zip_file)

    print("[VoiceMask] Extracting driver...")

    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall("vbcable")

    installer = os.path.join("vbcable", "VBCABLE_Setup_x64.exe")

    if os.path.exists(installer):
        print("[VoiceMask] Launching VB Cable installer...")
        subprocess.run(installer)

    print("[VoiceMask] Installation process completed.")