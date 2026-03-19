
import { useEffect, useRef, useState, useCallback } from 'react';
import { useCamera } from '../contexts/CameraContext';

// --- LOGIC ---
// We use dynamic import for MediaPipe tasks-vision via esm.sh to avoid SyntaxError with 'export'
// and ensure correct module loading.

interface GestureState {
  isLoaded: boolean;
  error: string | null;
  detectedGesture: string | null; // "1", "2", "3", "4", "NEXT", "BACK"
  dwellProgress: number; // 0 - 100
}

export const useHandGesture = (
  onTrigger: (gesture: string) => void,
  isPaused: boolean
) => {
  const { videoRef, isCameraReady, stream } = useCamera();
  const onTriggerRef = useRef(onTrigger);
  
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const [state, setState] = useState<GestureState>({
    isLoaded: false,
    error: null,
    detectedGesture: null,
    dwellProgress: 0,
  });
  
  const [isHandDetected, setIsHandDetected] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>(0);
  const lastGestureRef = useRef<string | null>(null);
  const gestureStartTimeRef = useRef<number>(0);
  const hasTriggeredRef = useRef<boolean>(false);
  const lastVideoTimeRef = useRef<number>(-1);

  // --- 1. LOAD MEDIAPIPE ---
  useEffect(() => {
    let active = true;
    let loadTimeout: NodeJS.Timeout;
    
    const loadMediaPipe = async () => {
      try {
        // Set a timeout to detect hangs
        loadTimeout = setTimeout(() => {
            if (active) setState(prev => ({ ...prev, error: "Koneksi lambat. Gagal memuat AI." }));
        }, 15000);

        // @ts-ignore
        const { FilesetResolver, HandLandmarker } = await import("https://esm.sh/@mediapipe/tasks-vision@0.10.17");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"
        );

        if (!active) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        clearTimeout(loadTimeout);

        if (!active) {
            landmarker.close();
            return;
        }

        landmarkerRef.current = landmarker;
        setState(prev => ({ ...prev, isLoaded: true }));
        // Camera is managed by context
        
      } catch (err: any) {
        console.error("MediaPipe Load Error:", err);
        clearTimeout(loadTimeout);
        if (active) setState(prev => ({ ...prev, error: "Gagal memuat AI Kamera. Cek koneksi internet." }));
      }
    };

    loadMediaPipe();

    return () => {
      active = false;
      clearTimeout(loadTimeout);
      if (landmarkerRef.current) {
          landmarkerRef.current.close();
          landmarkerRef.current = null;
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Start prediction loop when camera is ready
  useEffect(() => {
    if (isCameraReady && landmarkerRef.current && !state.error) {
        requestRef.current = requestAnimationFrame(predictWebcam);
    }
    return () => {
        cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraReady, state.isLoaded, state.error]);

  // --- 3. DETECTION LOOP (THROTTLED) ---
  const predictWebcam = async () => {
    if (!landmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    
    // Safety check for video readiness
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }
    
    if (video.currentTime !== lastVideoTimeRef.current) {
        const timeDiff = (video.currentTime - lastVideoTimeRef.current) * 1000;
        if (timeDiff < 100) { // ~10 FPS for smoother feedback
             requestRef.current = requestAnimationFrame(predictWebcam);
             return;
        }
        lastVideoTimeRef.current = video.currentTime;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // --- DRAW ROI BOX (Centered) ---
            // Increased ROI size as requested ("Kotak inputnya kekecilan")
            const roiW = canvas.width * 0.6; // 60% width (was 40%)
            const roiH = canvas.height * 0.7; // 70% height (was 50%)
            const roiX = (canvas.width - roiW) / 2; // Centered X
            const roiY = (canvas.height - roiH) / 2; // Centered Y

            let startTimeMs = performance.now();
            const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              if (results.landmarks && results.landmarks.length > 0) {
                  const landmarks = results.landmarks[0];
                  setIsHandDetected(true);
                  
                  // --- 1. Check ROI ---
                  const wrist = landmarks[0];
                  // Use a more forgiving ROI check (center of hand instead of just wrist)
                  const middleMCP = landmarks[9];
                  const handCenterX = (wrist.x + middleMCP.x) / 2;
                  const handCenterY = (wrist.y + middleMCP.y) / 2;

                  const inROI = (handCenterX * canvas.width > roiX) && 
                                (handCenterX * canvas.width < roiX + roiW) &&
                                (handCenterY * canvas.height > roiY) &&
                                (handCenterY * canvas.height < roiY + roiH);

                  // Draw Skeleton (Neon Style)
                  drawHand(ctx, landmarks, inROI ? '#00ffcc' : '#f43f5e');

                  // Draw ROI Box Visual
                  ctx.strokeStyle = inROI ? 'rgba(0, 255, 204, 0.5)' : 'rgba(255, 255, 255, 0.3)';
                  ctx.lineWidth = 2;
                  ctx.setLineDash([10, 10]);
                  ctx.strokeRect(roiX, roiY, roiW, roiH);
                  ctx.setLineDash([]);

                  if (inROI && !isPaused) {
                    const gesture = recognizeGesture(landmarks);
                    handleDwellTime(gesture);
                  } else {
                    resetDwell();
                  }
              } else {
                  setIsHandDetected(false);
                  resetDwell();
              }
            }
        }
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  // --- 4. GESTURE RECOGNITION MATH (ROTATION INVARIANT) ---
  const recognizeGesture = (landmarks: any[]) => {
      // Helper: Calculate Euclidean distance between two landmarks
      const dist = (p1: any, p2: any) => {
          return Math.hypot(p1.x - p2.x, p1.y - p2.y);
      };

      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexPIP = landmarks[6];
      const middleTip = landmarks[12];
      const middlePIP = landmarks[10];
      const ringTip = landmarks[16];
      const ringPIP = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyPIP = landmarks[18];

      // Reference Scale: Distance from Wrist to Middle Finger MCP (Knuckle)
      const middleMCP = landmarks[9];
      const handScale = dist(wrist, middleMCP);

      // --- 1. Detect Extended Fingers (Geometric & Rotation Invariant) ---
      // A finger is extended if the Tip is further from the Wrist than the PIP joint is.
      // We add a small buffer (0.1 * scale) to be robust against slight bends.
      
      const isExtended = (tip: any, pip: any) => {
          return dist(tip, wrist) > dist(pip, wrist) + (handScale * 0.1);
      };

      const indexExt = isExtended(indexTip, indexPIP);
      const middleExt = isExtended(middleTip, middlePIP);
      const ringExt = isExtended(ringTip, ringPIP);
      const pinkyExt = isExtended(pinkyTip, pinkyPIP);

      // --- 2. Detect Thumb State ---
      // Thumb is tricky. We check if it's "out" (away from the hand center).
      // We compare ThumbTip distance to PinkyMCP vs IndexMCP distance to PinkyMCP.
      const pinkyMCP = landmarks[17];
      const thumbOut = dist(thumbTip, pinkyMCP) > dist(indexTip, pinkyMCP) * 0.8;
      
      // Alternative Thumb Check: Angle based? 
      // Simple check: Is thumb tip far from index MCP?
      const indexMCP = landmarks[5];
      const thumbExtended = dist(thumbTip, indexMCP) > handScale * 0.5;

      // Count extended fingers (excluding thumb for now)
      const fingersCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);

      // --- 3. Map Shapes to Gestures ---

      // GESTURE: "NEXT" -> Thumbs Up (or Thumb Out)
      // Shape: Thumb Extended, 0 other fingers extended.
      // Works in any orientation (Thumbs Up, Thumbs Down, Thumbs Side).
      if (fingersCount === 0 && thumbExtended) {
          return "NEXT";
      }

      // GESTURE: "BACK" -> Open Palm (5 Fingers)
      // Shape: All 4 fingers extended + Thumb extended
      if (fingersCount === 4 && thumbExtended) {
          return "BACK";
      }

      // GESTURE: "1" (Option A) -> Index Only
      if (fingersCount === 1 && indexExt) {
          return "1";
      }

      // GESTURE: "2" (Option B) -> Index + Middle (Peace Sign)
      if (fingersCount === 2 && indexExt && middleExt) {
          return "2";
      }

      // GESTURE: "3" (Option C) -> Index + Middle + Ring
      if (fingersCount === 3 && indexExt && middleExt && ringExt) {
          return "3";
      }

      // GESTURE: "4" (Option D) -> 4 Fingers (Thumb Tucked)
      if (fingersCount === 4 && !thumbExtended) {
          return "4";
      }

      // GESTURE: "Fist" (All Closed) -> Maybe ignore or map to something else?
      // Currently returns null.

      return null;
  };

  // --- 5. DWELL TIME LOGIC ---
  const handleDwellTime = (gesture: string | null) => {
     const now = performance.now();
     const DWELL_DURATION = 1200; // 1.2s (was 1.6s) for snappier feel
     
     if (gesture && gesture === lastGestureRef.current) {
        const duration = now - gestureStartTimeRef.current;
        const progress = Math.min(100, (duration / DWELL_DURATION) * 100); 
        
        setState(prev => ({ ...prev, detectedGesture: gesture, dwellProgress: progress }));

        if (duration > DWELL_DURATION && !hasTriggeredRef.current) {
           onTriggerRef.current(gesture);
           hasTriggeredRef.current = true;
           if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]); // Burst vibrate
        }
     } else {
        lastGestureRef.current = gesture;
        gestureStartTimeRef.current = now;
        hasTriggeredRef.current = false;
        setState(prev => ({ 
            ...prev, 
            detectedGesture: gesture, 
            dwellProgress: 0 
        }));
     }
  };

  const resetDwell = () => {
     lastGestureRef.current = null;
     gestureStartTimeRef.current = 0;
     setState(prev => ({ ...prev, detectedGesture: null, dwellProgress: 0 }));
  };

  const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any[], color: string) => {
      // Neon Glow Effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
      ];

      for (const [start, end] of connections) {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
          ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
      }
      ctx.stroke();
      
      // Draw Joints (Nodes)
      ctx.fillStyle = '#ffffff';
      for (const landmark of landmarks) {
          ctx.beginPath();
          ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, 2, 0, 2 * Math.PI);
          ctx.fill();
      }
      
      // Reset Shadow
      ctx.shadowBlur = 0;
  };

  return { canvasRef, isHandDetected, stream, ...state };
};
