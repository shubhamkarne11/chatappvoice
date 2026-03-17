import driver_installer
driver_installer.install_vbcable()

import sys
import threading
import numpy as np
import pyqtgraph as pg

from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QSlider, QComboBox,
    QGroupBox, QFrame
)

import audio_engine

audio_engine.reset_devices()

# ------------------------------
# MODERN STYLE
# ------------------------------

STYLE = """
QMainWindow{
background:#0f172a;
}

QLabel{
color:#e2e8f0;
font-size:13px;
}

QPushButton{
background:#2563eb;
color:white;
border-radius:8px;
padding:8px;
font-weight:bold;
}

QPushButton:hover{
background:#3b82f6;
}

QComboBox{
background:#1e293b;
color:#e2e8f0;
border:1px solid #334155;
border-radius:6px;
padding:6px 8px;
min-height:28px;
}

QComboBox:hover{
border:1px solid #38bdf8;
}

QComboBox::drop-down{
border:none;
width:24px;
}

QComboBox::down-arrow{
image:none;
border-left:5px solid transparent;
border-right:5px solid transparent;
border-top:6px solid #38bdf8;
margin-right:8px;
}

QComboBox QAbstractItemView{
background:#020617;
color:#e2e8f0;
border:1px solid #334155;
selection-background-color:#2563eb;
selection-color:white;
padding:6px;
outline:0px;
}

QSlider::groove:horizontal{
height:6px;
background:#1e293b;
border-radius:3px;
}

QSlider::handle:horizontal{
background:#38bdf8;
width:16px;
border-radius:8px;
margin:-5px 0;
}

QGroupBox{
border:1px solid #1e293b;
border-radius:10px;
margin-top:12px;
padding:10px;
color:#38bdf8;
font-weight:bold;
}

QGroupBox::title{
left:10px;
padding:2px 6px;
}
"""

# ------------------------------
# MAIN APP
# ------------------------------

class VoiceMaskApp(QMainWindow):

    def __init__(self):
        super().__init__()

        self.setWindowTitle("🛡 SoundShield Pro")
        self.resize(1100, 800)
        self.setStyleSheet(STYLE)

        self._audio_thread = None

        self.build_ui()
        self.populate_devices()

        self.timer = QTimer()
        self.timer.timeout.connect(self.update_ui)
        self.timer.start(100)

    # --------------------------

    def build_ui(self):

        central = QWidget()
        root_layout = QHBoxLayout(central)

        # --------------------------
        # SIDEBAR
        # --------------------------

        sidebar = QFrame()
        sidebar.setFixedWidth(220)
        sidebar.setStyleSheet("background:#020617")

        side_layout = QVBoxLayout(sidebar)

        logo = QLabel("🛡 SoundShield")
        logo.setAlignment(Qt.AlignCenter)
        logo.setStyleSheet("font-size:22px;font-weight:bold;color:#38bdf8")

        side_layout.addWidget(logo)
        side_layout.addSpacing(20)

        self.status_label = QLabel("● Stopped")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("color:red;font-size:14px")

        side_layout.addWidget(self.status_label)
        side_layout.addStretch()

        root_layout.addWidget(sidebar)

        # --------------------------
        # MAIN PANEL
        # --------------------------

        main = QWidget()
        main_layout = QVBoxLayout(main)

        # --------------------------
        # AUDIO DEVICES
        # --------------------------

        dev_grp = QGroupBox("Audio Devices")
        dev_layout = QVBoxLayout()

        dev_layout.addWidget(QLabel("Input Microphone"))

        self.combo_in = QComboBox()
        self.combo_in.currentIndexChanged.connect(self.apply_devices)
        dev_layout.addWidget(self.combo_in)

        dev_layout.addWidget(QLabel("Output Device (VB Cable)"))

        self.combo_out = QComboBox()
        self.combo_out.currentIndexChanged.connect(self.apply_devices)
        dev_layout.addWidget(self.combo_out)

        dev_grp.setLayout(dev_layout)
        main_layout.addWidget(dev_grp)

        # --------------------------
        # VOICE EFFECT
        # --------------------------

        effect_grp = QGroupBox("Voice Effect")
        effect_layout = QVBoxLayout()

        self.effect_combo = QComboBox()
        self.effect_combo.addItems([
            "mask",
            "female",
            "deep",
            "robot",
            "echo",
            "demon",
            "clean"
        ])

        self.effect_combo.currentTextChanged.connect(self.change_effect)

        effect_layout.addWidget(self.effect_combo)
        effect_grp.setLayout(effect_layout)

        main_layout.addWidget(effect_grp)

        # --------------------------
        # PRIVACY STRENGTH
        # --------------------------

        strength_grp = QGroupBox("Privacy Strength")
        strength_layout = QVBoxLayout()

        self.str_label = QLabel("5 / 10")
        self.str_label.setAlignment(Qt.AlignCenter)

        strength_layout.addWidget(self.str_label)

        self.slider = QSlider(Qt.Horizontal)
        self.slider.setMinimum(0)
        self.slider.setMaximum(10)
        self.slider.setValue(5)

        self.slider.valueChanged.connect(self.change_strength)

        strength_layout.addWidget(self.slider)

        strength_grp.setLayout(strength_layout)

        main_layout.addWidget(strength_grp)

        # --------------------------
        # CONTROL BUTTONS
        # --------------------------

        control_layout = QHBoxLayout()

        self.btn_start = QPushButton("▶ Start Protection")
        self.btn_start.setStyleSheet("background:#16a34a")
        self.btn_start.clicked.connect(self.start_engine)

        self.btn_stop = QPushButton("■ Stop Protection")
        self.btn_stop.setStyleSheet("background:#dc2626")
        self.btn_stop.clicked.connect(self.stop_engine)

        control_layout.addWidget(self.btn_start)
        control_layout.addWidget(self.btn_stop)

        main_layout.addLayout(control_layout)

        # --------------------------
        # MICROPHONE LEVEL
        # --------------------------

        level_grp = QGroupBox("Microphone Level")
        level_layout = QVBoxLayout()

        self.level_bar = QSlider(Qt.Horizontal)
        self.level_bar.setMinimum(0)
        self.level_bar.setMaximum(100)
        self.level_bar.setValue(0)
        self.level_bar.setEnabled(False)

        level_layout.addWidget(self.level_bar)

        level_grp.setLayout(level_layout)
        main_layout.addWidget(level_grp)

        # --------------------------
        # LIVE VOICE ANALYZER
        # --------------------------

        analyzer_grp = QGroupBox("Live Voice Analyzer")
        analyzer_layout = QVBoxLayout()

        self.wave_plot = pg.PlotWidget()
        self.wave_plot.setBackground("#020617")

        self.wave_curve = self.wave_plot.plot(pen="#22c55e")

        analyzer_layout.addWidget(QLabel("Waveform"))
        analyzer_layout.addWidget(self.wave_plot)

        self.spec_plot = pg.PlotWidget()
        self.spec_plot.setBackground("#020617")

        self.spec_curve = self.spec_plot.plot(pen="#38bdf8")

        analyzer_layout.addWidget(QLabel("Spectrum"))
        analyzer_layout.addWidget(self.spec_plot)

        analyzer_grp.setLayout(analyzer_layout)

        main_layout.addWidget(analyzer_grp)

        # --------------------------
        # AI SPEECH ANALYSIS
        # --------------------------

        analysis_grp = QGroupBox("AI Speech Analysis")
        analysis_layout = QVBoxLayout()

        self.energy_label = QLabel("Energy: 0")
        self.pitch_label = QLabel("Pitch: 0")
        self.speed_label = QLabel("Speech Speed: 0")

        analysis_layout.addWidget(self.energy_label)
        analysis_layout.addWidget(self.pitch_label)
        analysis_layout.addWidget(self.speed_label)

        analysis_grp.setLayout(analysis_layout)

        main_layout.addWidget(analysis_grp)

        root_layout.addWidget(main)

        self.setCentralWidget(central)

    # --------------------------

    def populate_devices(self):

        devices = audio_engine.list_devices()

        self.combo_in.clear()
        self.combo_out.clear()

        for dev in devices:

            label = f"[{dev['index']}] {dev['name']}"

            if dev["inputs"] > 0:
                self.combo_in.addItem(label, dev["index"])

            if dev["outputs"] > 0:
                self.combo_out.addItem(label, dev["index"])

    # --------------------------

    def apply_devices(self):

        in_idx = self.combo_in.currentData()
        out_idx = self.combo_out.currentData()

        if in_idx is not None:
            audio_engine.INPUT_DEVICE = int(in_idx)

        if out_idx is not None:
            audio_engine.OUTPUT_DEVICE = int(out_idx)

    # --------------------------

    def change_effect(self, effect):
        audio_engine.set_effect(effect)

    # --------------------------

    def change_strength(self, value):

        audio_engine.set_strength(value)
        self.str_label.setText(f"{value} / 10")

    # --------------------------

    def start_engine(self):

        if audio_engine.running:
            return

        self.apply_devices()

        self._audio_thread = threading.Thread(
            target=audio_engine.start_stream,
            daemon=True
        )

        self._audio_thread.start()

    # --------------------------

    def stop_engine(self):
        audio_engine.stop_stream()

    # --------------------------

    def update_ui(self):

        if audio_engine.running:
            self.status_label.setText("● Active")
            self.status_label.setStyleSheet("color:#22c55e;font-size:14px")
        else:
            self.status_label.setText("● Stopped")
            self.status_label.setStyleSheet("color:red;font-size:14px")

        audio = audio_engine.latest_audio_block

        if audio is not None:

            level = int(np.max(np.abs(audio)) * 100)
            self.level_bar.setValue(level)

            self.wave_curve.setData(audio)

            fft = np.abs(np.fft.rfft(audio))
            self.spec_curve.setData(fft)

        stats = audio_engine.get_speech_stats()

        if stats:

            self.energy_label.setText(f"Energy: {stats.get('energy',0):.6f}")
            self.pitch_label.setText(f"Pitch: {stats.get('pitch',0):.2f}")
            self.speed_label.setText(f"Speech Speed: {stats.get('speed',0):.4f}")

# --------------------------

if __name__ == "__main__":

    app = QApplication(sys.argv)

    window = VoiceMaskApp()
    window.show()

    sys.exit(app.exec_())