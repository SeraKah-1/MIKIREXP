import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

type CameraMode = 'OFF' | 'EYE' | 'HAND';

interface CameraContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isCameraReady: boolean;
  error: string | null;
  mode: CameraMode;
  setMode: (mode: CameraMode) => void;
  stream: MediaStream | null;
}

const CameraContext = createContext<CameraContextType | null>(null);

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};

export const CameraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>('OFF');
  const requestRef = useRef<number>(0);

  const startCamera = useCallback(async () => {
    if (stream) return; // Already running

    try {
      setError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Wait for metadata to load
        await new Promise((resolve) => {
            if (videoRef.current) {
                videoRef.current.onloadedmetadata = resolve;
            } else {
                resolve(null);
            }
        });
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Camera Start Error:", err);
      setError("Gagal mengakses kamera. Pastikan izin diberikan.");
      setMode('OFF');
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, [stream]);

  // Effect to handle camera lifecycle based on mode
  useEffect(() => {
    if (mode === 'OFF') {
      stopCamera();
    } else {
      // If switching between EYE and HAND, camera stays ON.
      // Only start if not already running.
      if (!stream) {
        startCamera();
      }
    }
  }, [mode, startCamera, stopCamera, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <CameraContext.Provider value={{ 
      videoRef, 
      canvasRef, 
      isCameraReady, 
      error, 
      mode, 
      setMode, 
      stream 
    }}>
      {children}
      {/* Global Hidden Video Element */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} // Hidden, but active in DOM
        playsInline 
        muted 
        autoPlay 
      />
      {/* Global Canvas for Debug/Overlay if needed */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </CameraContext.Provider>
  );
};
