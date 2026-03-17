import sys
import numpy as np
import sounddevice as sd
import soundfile as sf
import pyqtgraph as pg
import random

from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QPushButton,
    QLabel, QComboBox, QTextEdit, QHBoxLayout, QGroupBox
)

from PyQt5.QtCore import QTimer


STYLE = """
QWidget{
background:#020617;
color:#00ff9c;
font-family:Consolas;
font-size:13px;
}

QPushButton{
background:#111;
border:1px solid #00ff9c;
padding:8px;
}

QPushButton:hover{
background:#00ff9c;
color:black;
}

QComboBox{
background:#111;
border:1px solid #00ff9c;
padding:6px;
}

QTextEdit{
background:#000;
border:1px solid #00ff9c;
}
"""


class MITMConsole(QWidget):

    def __init__(self):

        super().__init__()

        self.setWindowTitle("⚠ MITM Interception Console")
        self.resize(900,700)

        self.setStyleSheet(STYLE)

        self.recording = False
        self.audio_data = []

        self.build_ui()
        self.populate_devices()

        self.timer = QTimer()
        self.timer.timeout.connect(self.update_plots)

        self.log_timer = QTimer()
        self.log_timer.timeout.connect(self.generate_logs)

    # -------------------------

    def build_ui(self):

        layout = QVBoxLayout()

        title = QLabel("MITM VOICE INTERCEPTION SYSTEM")
        title.setStyleSheet("font-size:18px;font-weight:bold")
        layout.addWidget(title)

        # device selector
        device_grp = QGroupBox("Audio Source")

        dev_layout = QVBoxLayout()

        self.device_box = QComboBox()

        dev_layout.addWidget(self.device_box)

        device_grp.setLayout(dev_layout)

        layout.addWidget(device_grp)

        # buttons
        btn_layout = QHBoxLayout()

        self.start_btn = QPushButton("▶ START INTERCEPTION")
        self.stop_btn = QPushButton("■ STOP INTERCEPTION")

        btn_layout.addWidget(self.start_btn)
        btn_layout.addWidget(self.stop_btn)

        layout.addLayout(btn_layout)

        # waveform
        wave_grp = QGroupBox("Live Audio Waveform")

        wave_layout = QVBoxLayout()

        self.wave_plot = pg.PlotWidget()
        self.wave_plot.setBackground("#000")

        self.wave_curve = self.wave_plot.plot(pen=pg.mkPen("#00ff9c", width=2))

        wave_layout.addWidget(self.wave_plot)

        wave_grp.setLayout(wave_layout)

        layout.addWidget(wave_grp)

        # spectrum
        spec_grp = QGroupBox("Frequency Spectrum")

        spec_layout = QVBoxLayout()

        self.spec_plot = pg.PlotWidget()
        self.spec_plot.setBackground("#000")

        self.spec_curve = self.spec_plot.plot(pen=pg.mkPen("#38bdf8", width=2))

        spec_layout.addWidget(self.spec_plot)

        spec_grp.setLayout(spec_layout)

        layout.addWidget(spec_grp)

        # signal strength
        level_grp = QGroupBox("Signal Strength")

        level_layout = QVBoxLayout()

        self.level_plot = pg.PlotWidget()
        self.level_plot.setBackground("#000")

        self.level_bar = pg.BarGraphItem(x=[0], height=[0], width=0.5, brush="#00ff9c")

        self.level_plot.addItem(self.level_bar)

        level_layout.addWidget(self.level_plot)

        level_grp.setLayout(level_layout)

        layout.addWidget(level_grp)

        # logs
        log_grp = QGroupBox("Interception Logs")

        log_layout = QVBoxLayout()

        self.console = QTextEdit()
        self.console.setReadOnly(True)

        log_layout.addWidget(self.console)

        log_grp.setLayout(log_layout)

        layout.addWidget(log_grp)

        self.setLayout(layout)

        # buttons
        self.start_btn.clicked.connect(self.start_interception)
        self.stop_btn.clicked.connect(self.stop_interception)

    # -------------------------

    def populate_devices(self):

        devices = sd.query_devices()

        for i, dev in enumerate(devices):

            if dev["max_input_channels"] > 0:

                label = f"[{i}] {dev['name']}"
                self.device_box.addItem(label, i)

    # -------------------------

    def start_interception(self):

        device = self.device_box.currentData()

        self.console.append("[+] Initializing interception module")
        self.console.append("[+] Capturing audio stream")

        self.audio_data = []
        self.recording = True

        self.stream = sd.InputStream(
            device=device,
            channels=1,
            samplerate=48000,
            callback=self.audio_callback
        )

        self.stream.start()

        self.timer.start(100)
        self.log_timer.start(2000)

    # -------------------------

    def stop_interception(self):

        self.console.append("[!] Interception stopped")

        self.recording = False

        if hasattr(self,"stream"):
            self.stream.stop()

        self.timer.stop()
        self.log_timer.stop()

        if len(self.audio_data) > 0:

            audio = np.concatenate(self.audio_data)

            filename = "intercepted_voice.wav"

            sf.write(filename, audio, 48000)

            self.console.append(f"[+] Recording saved -> {filename}")

    # -------------------------

    def audio_callback(self,indata,frames,time,status):

        if self.recording:

            audio = indata[:,0].copy()

            self.latest_audio = audio

            self.audio_data.append(audio)

    # -------------------------

    def update_plots(self):

        if hasattr(self,"latest_audio"):

            audio = self.latest_audio

            self.wave_curve.setData(audio)

            fft = np.abs(np.fft.rfft(audio))
            self.spec_curve.setData(fft)

            level = np.max(np.abs(audio))*10
            self.level_bar.setOpts(height=[level])

    # -------------------------

    def generate_logs(self):

        logs = [

        "Capturing audio packets...",
        "Intercepting voice stream...",
        "Decoding audio signal...",
        "Analyzing waveform...",
        "Buffering intercepted data...",
        "Monitoring voice packets...",
        "Extracting voice payload...",
        "Voice packet captured..."

        ]

        self.console.append("[+] " + random.choice(logs))


# -------------------------

if __name__ == "__main__":

    app = QApplication(sys.argv)

    window = MITMConsole()
    window.show()

    sys.exit(app.exec_())