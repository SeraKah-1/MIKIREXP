import React, { useEffect, useRef, useState } from 'react';
import { useCamera } from '../contexts/CameraContext';

interface EyeTrackingManagerProps {
  onOptionSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isAnswered: boolean;
}

export const EyeTrackingManager: React.FC<EyeTrackingManagerProps> = ({
  onOptionSelect,
  onNext,
  onPrev,
  isAnswered
}) => {
  const { videoRef: globalVideoRef, isCameraReady, stream } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // Sync stream to local video for visualization
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  const [status, setStatus] = useState<string>('Loading AI...');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  // Ghost Pointer Ref (Direct DOM Mutation)
  const pointerRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastNosePosRef = useRef<{x: number, y: number} | null>(null);
  const smoothedMoveRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  
  // Dwell Time State
  const [hoveredOption, setHoveredOption] = useState<number | string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  
  // Navigation Dwell State
  const [hoveredNav, setHoveredNav] = useState<'prev' | 'next' | null>(null);
  const [navDwellProgress, setNavDwellProgress] = useState(0);
  
  // Scroll Feedback State
  const [hoveredScroll, setHoveredScroll] = useState<'up' | 'down' | null>(null);
  const lastScrollStateRef = useRef<'up' | 'down' | null>(null);

  const hoverStartTimeRef = useRef<number>(0);
  const currentHoveredOptionRef = useRef<number | string | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);
  const DWELL_DURATION = 1500; // 1.5 seconds

  const navHoverStartTimeRef = useRef<number>(0);
  const currentHoveredNavRef = useRef<'prev' | 'next' | null>(null);
  const hasNavTriggeredRef = useRef<boolean>(false);
  const NAV_DWELL_DURATION = 2000; // 2.0 seconds

  // Smile to Reset State
  const [isSmiling, setIsSmiling] = useState(false);
  const isSmilingRef = useRef(false);
  const smileStartTimeRef = useRef<number>(0);
  const hasSmileTriggeredRef = useRef<boolean>(false);
  const SMILE_DWELL_DURATION = 500; // 0.5 seconds of smiling to reset

  useEffect(() => {
    let active = true;
    let loadTimeout: NodeJS.Timeout;
    
    const initMediaPipe = async () => {
      try {
        loadTimeout = setTimeout(() => {
            if (active) setStatus('Connection slow...');
        }, 15000);

        // @ts-ignore
        const { FilesetResolver, FaceLandmarker } = await import("https://esm.sh/@mediapipe/tasks-vision@0.10.17");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"
        );

        if (!active) return;

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 3, 
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true
        });

        clearTimeout(loadTimeout);

        if (!active) {
            landmarker.close();
            return;
        }

        landmarkerRef.current = landmarker;
        setIsModelLoaded(true);
        setStatus('AI Ready. Waiting for Camera...');
        
      } catch (err) {
        console.error("FaceLandmarker Error:", err);
        clearTimeout(loadTimeout);
        if (active) setStatus('Error loading AI');
      }
    };

    initMediaPipe();

    return () => {
      active = false;
      clearTimeout(loadTimeout);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = 0;
      }
    };
  }, []);

  const onOptionSelectRef = useRef(onOptionSelect);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);

  useEffect(() => {
    onOptionSelectRef.current = onOptionSelect;
    onNextRef.current = onNext;
    onPrevRef.current = onPrev;
  }, [onOptionSelect, onNext, onPrev]);

  // Start prediction loop when camera is ready
  useEffect(() => {
    if (isCameraReady && isModelLoaded && landmarkerRef.current) {
        setStatus('Tracking Active');
        requestRef.current = requestAnimationFrame(predictWebcam);
    }
    return () => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = 0;
        }
    };
  }, [isCameraReady, isModelLoaded]);

  const predictWebcam = () => {
    if (!landmarkerRef.current || !globalVideoRef.current) return;

    const video = globalVideoRef.current;
    
    // Safety check
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }

    let targetX = cursorPosRef.current.x;
    let targetY = cursorPosRef.current.y;
    let showCursor = false;
    let currentlyHovered: number | string | null = null;
    let currentlyHoveredNav: 'prev' | 'next' | null = null;

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      let startTimeMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        // Ensure canvas matches video dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        // --- SMILE DETECTION (BLENDSHAPES) ---
        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const blendshapes = results.faceBlendshapes[0].categories;
            const smileLeft = blendshapes.find((b: any) => b.categoryName === 'mouthSmileLeft')?.score || 0;
            const smileRight = blendshapes.find((b: any) => b.categoryName === 'mouthSmileRight')?.score || 0;
            
            // If both sides of the mouth are smiling significantly
            if (smileLeft > 0.5 && smileRight > 0.5) {
                if (!isSmilingRef.current) {
                    isSmilingRef.current = true;
                    setIsSmiling(true);
                    smileStartTimeRef.current = performance.now();
                    hasSmileTriggeredRef.current = false;
                } else {
                    const smileDuration = performance.now() - smileStartTimeRef.current;
                    if (smileDuration > SMILE_DWELL_DURATION && !hasSmileTriggeredRef.current) {
                        // Trigger Reset!
                        cursorPosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                        lastNosePosRef.current = null; // Clear last nose pos so it doesn't jump back
                        smoothedMoveRef.current = { x: 0, y: 0 }; // Clear momentum
                        hasSmileTriggeredRef.current = true;
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
                    }
                }
            } else {
                if (isSmilingRef.current) {
                    isSmilingRef.current = false;
                    setIsSmiling(false);
                }
                hasSmileTriggeredRef.current = false;
            }
        }

        // --- VIP BOX FILTER ---
        let vipFace = null;
        let maxBoxArea = 0;

        for (const landmarks of results.faceLandmarks) {
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          for (const p of landmarks) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          const area = (maxX - minX) * (maxY - minY);

          if (area > maxBoxArea) {
            maxBoxArea = area;
            vipFace = landmarks;
          }
        }

        if (vipFace) {
          const nose = vipFace[1]; // Nose tip

          if (lastNosePosRef.current) {
            const deltaX = nose.x - lastNosePosRef.current.x;
            const deltaY = nose.y - lastNosePosRef.current.y;
            
            // Note: Camera is mirrored, so we invert X delta
            const moveX = -deltaX;
            const moveY = deltaY;

            // Apply smoothing
            const SMOOTHING = 0.6; // 0 to 1, higher is smoother but more lag
            smoothedMoveRef.current.x = smoothedMoveRef.current.x * SMOOTHING + moveX * (1 - SMOOTHING);
            smoothedMoveRef.current.y = smoothedMoveRef.current.y * SMOOTHING + moveY * (1 - SMOOTHING);

            const speed = Math.hypot(smoothedMoveRef.current.x, smoothedMoveRef.current.y);
            
            const BASE_SENSITIVITY = 4000;
            const ACCELERATION_FACTOR = 150;

            const acceleration = 1 + (speed * ACCELERATION_FACTOR);
            
            cursorPosRef.current.x += smoothedMoveRef.current.x * BASE_SENSITIVITY * acceleration;
            cursorPosRef.current.y += smoothedMoveRef.current.y * BASE_SENSITIVITY * acceleration;

            // Clamp
            cursorPosRef.current.x = Math.max(0, Math.min(window.innerWidth, cursorPosRef.current.x));
            cursorPosRef.current.y = Math.max(0, Math.min(window.innerHeight, cursorPosRef.current.y));
          }

          lastNosePosRef.current = { x: nose.x, y: nose.y };
          targetX = cursorPosRef.current.x;
          targetY = cursorPosRef.current.y;

          // Draw Nose for debugging
          if (canvas && ctx) {
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc((1 - nose.x) * canvas.width, nose.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          lastNosePosRef.current = null;
        }
      } else {
        lastNosePosRef.current = null;
      }
    }

    // Smart Hiding (Reading Mode) - REMOVED to allow top scrolling
    showCursor = true;

    // Direct DOM Mutation for Zero Latency
    if (pointerRef.current) {
      pointerRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      pointerRef.current.style.opacity = showCursor ? '1' : '0';
      
      // Visual feedback for smiling
      if (isSmilingRef.current) {
          pointerRef.current.style.borderColor = '#10b981'; // Emerald-500
          pointerRef.current.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.8)';
          pointerRef.current.style.transform += ' scale(1.2)';
      } else {
          pointerRef.current.style.borderColor = 'rgba(255,255,255,0.8)';
          pointerRef.current.style.boxShadow = 'none';
      }
    }

    const px = targetX;
    const py = targetY;

    // --- AUTO SCROLLING ---
    let newScrollState: 'up' | 'down' | null = null;
    if (showCursor) {
      const scrollZone = window.innerHeight * 0.15;
      if (py > window.innerHeight - scrollZone) {
        newScrollState = 'down';
        const intensity = (py - (window.innerHeight - scrollZone)) / scrollZone;
        window.scrollBy({ top: intensity * 15, behavior: 'auto' });
      } else if (py < scrollZone) {
        newScrollState = 'up';
        const intensity = (scrollZone - py) / scrollZone;
        window.scrollBy({ top: -intensity * 15, behavior: 'auto' });
      }
    }
    
    if (newScrollState !== lastScrollStateRef.current) {
        lastScrollStateRef.current = newScrollState;
        setHoveredScroll(newScrollState);
    }

    // --- COLLISION DETECTION & DWELL TIME ---
    const now = performance.now();

    // 1. Navigation Hitboxes (Extreme Edges)
    const edgeWidth = window.innerWidth * 0.1; // 10vw

    if (px <= edgeWidth) {
      currentlyHoveredNav = 'prev';
    } else if (px >= window.innerWidth - edgeWidth) {
      currentlyHoveredNav = 'next';
    }

    // 2. Options Hitboxes (Only if not hovering nav)
    if (currentlyHoveredNav === null && showCursor) {
      const optionElements = document.querySelectorAll('[data-option-index], [data-nose-action]');

      optionElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Check if pointer is inside the bounding box of the option button
        if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
          if (el.hasAttribute('data-option-index')) {
            currentlyHovered = parseInt(el.getAttribute('data-option-index') || '-1', 10);
          } else if (el.hasAttribute('data-nose-action')) {
            currentlyHovered = el.getAttribute('data-nose-action') as any; // Hack to reuse currentlyHovered for actions
          }
        }
      });
    }

    // 1. Navigation Hitboxes
    if (currentlyHoveredNav !== null) {
      if (currentHoveredNavRef.current === currentlyHoveredNav) {
        const duration = now - navHoverStartTimeRef.current;
        const progress = Math.min(100, (duration / NAV_DWELL_DURATION) * 100);
        
        setNavDwellProgress(progress);

        if (duration >= NAV_DWELL_DURATION && !hasNavTriggeredRef.current) {
          hasNavTriggeredRef.current = true;
          if (currentlyHoveredNav === 'next') onNextRef.current();
          if (currentlyHoveredNav === 'prev') onPrevRef.current();
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }
      } else {
        currentHoveredNavRef.current = currentlyHoveredNav;
        navHoverStartTimeRef.current = now;
        hasNavTriggeredRef.current = false;
        setHoveredNav(currentlyHoveredNav);
        setNavDwellProgress(0);
      }
    } else {
      if (currentHoveredNavRef.current !== null) {
        currentHoveredNavRef.current = null;
        hasNavTriggeredRef.current = false;
        setHoveredNav(null);
        setNavDwellProgress(0);
      }
    }

    // 2. Options & Actions Hitboxes
    if (currentlyHovered !== null) {
      if (currentHoveredOptionRef.current === currentlyHovered) {
        const duration = now - hoverStartTimeRef.current;
        const progress = Math.min(100, (duration / DWELL_DURATION) * 100);
        
        setDwellProgress(progress);

        if (duration >= DWELL_DURATION && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          if (typeof currentlyHovered === 'number') {
            onOptionSelectRef.current(currentlyHovered);
          } else if (currentlyHovered === 'reset') {
            cursorPosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            lastNosePosRef.current = null;
            smoothedMoveRef.current = { x: 0, y: 0 };
          }
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }
      } else {
        currentHoveredOptionRef.current = currentlyHovered;
        hoverStartTimeRef.current = now;
        hasTriggeredRef.current = false;
        setHoveredOption(currentlyHovered);
        setDwellProgress(0);
      }
    } else {
      if (currentHoveredOptionRef.current !== null) {
        currentHoveredOptionRef.current = null;
        hasTriggeredRef.current = false;
        setHoveredOption(null);
        setDwellProgress(0);
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  // Keyboard shortcut to reset cursor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        cursorPosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        lastNosePosRef.current = null;
        smoothedMoveRef.current = { x: 0, y: 0 };
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- APPLY VISUAL FEEDBACK ---
  useEffect(() => {
    const optionElements = document.querySelectorAll('[data-option-index]');
    
    optionElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const idx = parseInt(htmlEl.getAttribute('data-option-index') || '-1', 10);
      
      if (idx === hoveredOption) {
        // Apply progress background
        htmlEl.style.background = `linear-gradient(to right, rgba(16, 185, 129, 0.2) ${dwellProgress}%, transparent ${dwellProgress}%)`;
        htmlEl.style.transform = `scale(${1 + (dwellProgress / 100) * 0.05})`; // Slight scale up
        htmlEl.style.transition = 'none'; // Disable CSS transition for smooth JS updates
      } else {
        // Reset
        htmlEl.style.background = '';
        htmlEl.style.transform = '';
        htmlEl.style.transition = 'all 0.2s ease';
      }
    });
  }, [hoveredOption, dwellProgress]);

  return (
    <>
      <div className="fixed top-4 left-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
        <span className="animate-pulse">👁️</span> 
        {status}
      </div>

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
        <div 
          className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold transition-all relative overflow-hidden flex items-center gap-2"
        >
          {isSmiling ? <span className="text-emerald-400">😊 Mereset...</span> : <span>Senyum untuk Reset (Atau Spasi)</span>}
        </div>
      </div>
      
      {/* GHOST POINTER (Chameleon Ring) */}
      <div 
        ref={pointerRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: '30px',
          height: '30px',
          border: '2px solid rgba(255,255,255,0.8)',
          backdropFilter: 'invert(1)',
          borderRadius: '50%',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          transform: `translate3d(${window.innerWidth / 2}px, ${window.innerHeight / 2}px, 0) translate(-50%, -50%)`
        }}
      />

      {/* NAVIGATION HITBOXES (Visual Feedback) */}
      <div 
        className={`fixed top-0 left-0 w-[10vw] h-full pointer-events-none z-[9998] transition-opacity duration-300 flex items-center justify-start pl-4 ${hoveredNav === 'prev' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: `linear-gradient(to right, rgba(99, 102, 241, 0.2) ${navDwellProgress}%, transparent ${navDwellProgress}%)` }}
      >
        <div className="text-indigo-500 font-bold text-xl opacity-50">PREV</div>
      </div>
      
      <div 
        className={`fixed top-0 right-0 w-[10vw] h-full pointer-events-none z-[9998] transition-opacity duration-300 flex items-center justify-end pr-4 ${hoveredNav === 'next' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: `linear-gradient(to left, rgba(99, 102, 241, 0.2) ${navDwellProgress}%, transparent ${navDwellProgress}%)` }}
      >
        <div className="text-indigo-500 font-bold text-xl opacity-50">NEXT</div>
      </div>

      {/* SCROLL HITBOXES (Visual Feedback) */}
      <div 
        className={`fixed top-0 left-0 w-full h-[15vh] pointer-events-none z-[9997] transition-opacity duration-300 flex justify-center items-start pt-4 ${hoveredScroll === 'up' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.2), transparent)' }}
      >
        <div className="text-emerald-500 font-bold text-xl opacity-70">SCROLL UP</div>
      </div>

      <div 
        className={`fixed bottom-0 left-0 w-full h-[15vh] pointer-events-none z-[9997] transition-opacity duration-300 flex justify-center items-end pb-4 ${hoveredScroll === 'down' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(to top, rgba(16, 185, 129, 0.2), transparent)' }}
      >
        <div className="text-emerald-500 font-bold text-xl opacity-70">SCROLL DOWN</div>
      </div>

      {/* DEBUG CAMERA FEED */}
      <div className="fixed bottom-4 right-4 z-[9999] w-[200px] h-[150px] rounded-xl overflow-hidden border-2 border-emerald-500 shadow-lg bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
        />
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
          width={320}
          height={240}
        />
      </div>
    </>
  );
};
