import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, MapPin, Radio, AlertCircle, Home, Briefcase, Coffee, Bath } from 'lucide-react';
import { getContextualLocation, saveEntry } from '../services/storage';
import { processAudioJournal } from '../services/gemini';
import { JournalEntry } from '../types';

interface RecorderWidgetProps {
  onEntrySaved: () => void;
}

const CONTEXT_TAGS = [
  { label: 'Home', icon: Home },
  { label: 'Work', icon: Briefcase },
  { label: 'Social', icon: Coffee },
  { label: 'Private', icon: Bath }, // Covers 'Toilet/Bathroom' scenarios
];

const RecorderWidget: React.FC<RecorderWidgetProps> = ({ onEntrySaved }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [locationName, setLocationName] = useState<string>('Locating...');
  const [manualContext, setManualContext] = useState<string>('Home');
  const [coords, setCoords] = useState<{lat: number, lng: number} | undefined>(undefined);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initial location fetch
    if (!navigator.geolocation) {
      setLocationName("Geo unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hour = new Date().getHours();
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationName(getContextualLocation(hour));
      },
      (err) => {
        console.error(err);
        setLocationName("Unknown Location");
      },
      { timeout: 10000 }
    );
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus', 
      'audio/webm', 
      'audio/mp4', 
      'audio/ogg'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ''; // Browser default
  };

  const startRecording = async () => {
    setErrorMsg(null);
    setIsInitializing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = handleStop;

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      let msg = "Microphone access failed.";
      if (err.name === 'NotAllowedError') msg = "Permission denied. Please allow microphone access.";
      if (err.name === 'NotFoundError') msg = "No microphone found.";
      setErrorMsg(msg);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleStop = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    
    // Determine mime type from recorder or default
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    
    if (audioBlob.size === 0) {
        setErrorMsg("Recording failed: No audio data captured.");
        setIsProcessing(false);
        return;
    }

    const now = new Date();
    // Combine GPS location with user manual context (e.g. "Home - Private")
    const combinedLocation = `${manualContext} (${locationName})`;
    
    try {
      const metadata = await processAudioJournal(audioBlob, {
        location: combinedLocation,
        timestamp: now.toLocaleString()
      });

      const newEntry: JournalEntry = {
        id: crypto.randomUUID(),
        timestamp: now.getTime(),
        dateStr: now.toLocaleString(),
        locationName: combinedLocation,
        coordinates: coords ? { latitude: coords.lat, longitude: coords.lng } : undefined,
        metadata
      };

      saveEntry(newEntry);
      onEntrySaved(); 
    } catch (error: any) {
      console.error("Processing failed:", error);
      setErrorMsg(error.message || "Failed to process audio with Gemini.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400 mb-2">
          MindVault
        </h2>
        <p className="text-slate-400 text-sm">
          {isRecording ? "Listening..." : "Select context & tap to record"}
        </p>
      </div>

      <div className="relative group mb-8">
        {/* Pulsing rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
            <div className="absolute inset-[-12px] rounded-full border border-red-500/30 animate-pulse" />
          </>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isInitializing}
          className={`
            relative z-10 flex items-center justify-center w-32 h-32 rounded-full 
            transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)]
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 scale-105' 
              : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105'
            }
            ${(isProcessing || isInitializing) ? 'opacity-80 cursor-wait' : ''}
          `}
        >
          {isInitializing ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : isProcessing ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="w-10 h-10 text-white fill-current" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
      </div>

      {/* Context Selector */}
      {!isRecording && !isProcessing && (
        <div className="flex gap-2 mb-6">
          {CONTEXT_TAGS.map((tag) => (
            <button
              key={tag.label}
              onClick={() => setManualContext(tag.label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                manualContext === tag.label 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <tag.icon className="w-3 h-3" />
              {tag.label}
            </button>
          ))}
        </div>
      )}

      <div className="h-12 flex flex-col items-center justify-center space-y-2 w-full max-w-xs">
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/50 px-3 py-2 rounded-lg border border-red-900 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isRecording && (
          <div className="text-2xl font-mono text-white font-light tracking-widest">
            {formatTime(recordingTime)}
          </div>
        )}
        
        {isProcessing && (
          <div className="text-indigo-300 animate-pulse flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span>Processing with Gemini...</span>
          </div>
        )}

        {!isRecording && !isProcessing && !errorMsg && (
          <div className="flex items-center gap-2 text-slate-500 text-sm bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
            <MapPin className="w-3 h-3 text-cyan-500" />
            <span>{locationName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecorderWidget;