import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import { colors } from '../config/constants';

const SIGNALING_URL = 'http://localhost:5001';

const CallLab = () => {
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('Enter a room ID to start a masked call lab.');
  const [isConnected, setIsConnected] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const maskedStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMaskedStream = async () => {
    const hasMedia =
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasMedia) {
      throw new Error('Browser does not support microphone access.');
    }

    const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = rawStream;

    const AudioContextCtor =
      (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;

    if (!AudioContextCtor) {
      throw new Error('Browser does not support Web Audio API.');
    }

    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(rawStream);
    const dest = audioContext.createMediaStreamDestination();

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.2;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 900; // child-like: reduce low frequencies

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6500;

    const formant1 = audioContext.createBiquadFilter();
    formant1.type = 'peaking';
    formant1.frequency.value = 2800;
    formant1.Q.value = 1.1;
    formant1.gain.value = 7;

    const formant2 = audioContext.createBiquadFilter();
    formant2.type = 'peaking';
    formant2.frequency.value = 4200;
    formant2.Q.value = 0.9;
    formant2.gain.value = 4;

    const distortion = audioContext.createWaveShaper();
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i += 1) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = x * 0.8;
    }
    distortion.curve = curve;
    distortion.oversample = '2x';

    source.connect(gainNode);
    gainNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(distortion);
    distortion.connect(dest);
    distortion.connect(audioContext.destination);

    const maskedStream = dest.stream;
    maskedStreamRef.current = maskedStream;

    return maskedStream;
  };

  const createPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    const maskedStream = await createMaskedStream();

    maskedStream.getTracks().forEach((track) => {
      pc.addTrack(track, maskedStream);
    });

    if (localAudioRef.current) {
      localAudioRef.current.srcObject = maskedStream;
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && roomId) {
        socketRef.current.emit('signal', {
          roomId,
          data: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    return pc;
  };

  const handleJoin = async () => {
    if (!roomId.trim()) {
      setStatus('Please enter a room ID.');
      return;
    }

    if (Platform.OS !== 'web') {
      setStatus('Calling lab is available only on web (browser) for now.');
      return;
    }

    try {
      if (!socketRef.current) {
        const socket = io(SIGNALING_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
        });

        socket.on('created', async () => {
          setStatus(`Room "${roomId}" created. Waiting for the other person to join...`);
          setIsInRoom(true);
          const pc = await createPeerConnection();
          pcRef.current = pc;
        });

        socket.on('joined', async () => {
          setStatus(`Joined room "${roomId}". Setting up call...`);
          setIsInRoom(true);
          const pc = await createPeerConnection();
          pcRef.current = pc;
        });

        socket.on('ready', async () => {
          setStatus('Both participants ready. Starting masked call...');
          if (!pcRef.current) {
            const pc = await createPeerConnection();
            pcRef.current = pc;
          }
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socketRef.current.emit('signal', { roomId, data: offer });
        });

        socket.on('signal', async (data) => {
          if (!pcRef.current) {
            const pc = await createPeerConnection();
            pcRef.current = pc;
          }

          if (data.type === 'offer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socketRef.current.emit('signal', { roomId, data: answer });
          } else if (data.type === 'answer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
          } else if (data.type === 'candidate') {
            if (data.candidate) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          }
        });

        socket.on('full', () => {
          setStatus('Room is full. Use a different room ID.');
        });
      }

      socketRef.current.emit('join', roomId);
      setStatus('Connecting to signaling server...');
    } catch (error) {
      console.error('Call lab error:', error);
      setStatus(error.message || 'Failed to join room.');
    }
  };

  const cleanupCall = () => {
    setIsInRoom(false);

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      localStreamRef.current = null;
    }

    if (maskedStreamRef.current) {
      maskedStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      maskedStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const handleLeave = () => {
    cleanupCall();
    setStatus('Left the call. You can join again with a room ID.');
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Call Lab (Web Only)</Text>
        <Text style={styles.subtitle}>
          Masked voice calling is available only when running this app in a web browser (Expo Web).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Masked Voice Call Lab</Text>
      <Text style={styles.subtitle}>
        Start a browser-to-browser call where your microphone is transformed to a child-like masked voice in real time.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Room ID (e.g. math-class-1)"
          placeholderTextColor={colors.textSecondary}
          value={roomId}
          onChangeText={setRoomId}
        />
        <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
          <Ionicons name="call-outline" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <Text style={styles.statusText}>{status}</Text>
      {isConnected && (
        <Text style={styles.connectionInfo}>Signaling: connected to {SIGNALING_URL}</Text>
      )}

      <View style={styles.audioRow}>
        <View style={styles.audioCard}>
          <Text style={styles.audioLabel}>You (masked)</Text>
          <audio
            ref={localAudioRef}
            autoPlay
            controls
          />
        </View>
        <View style={styles.audioCard}>
          <Text style={styles.audioLabel}>Remote</Text>
          <audio
            ref={remoteAudioRef}
            autoPlay
            controls
          />
        </View>
      </View>

      {isInRoom && (
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
          <Ionicons name="close-circle-outline" size={20} color={colors.textInverse} />
          <Text style={styles.leaveButtonText}>Leave Call</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    marginRight: 8,
  },
  joinButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  connectionInfo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  audioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  audioCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  audioLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  leaveButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
});

export default CallLab;

