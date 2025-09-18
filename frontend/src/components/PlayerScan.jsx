import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { Camera, Check, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../WebSocketContext';

/**
 * Component for scanning and capturing player's face before joining the game.
 * This helps associate username with detected player in the game.
 * 
 * Uses the same MediaPipe Selfie Segmentation as the game for consistent detection.
 */
const PlayerScan = ({ username, lobbyCode, onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { sendMessage, ws } = useWebSocket();

  // Segmentation state (same as in PlayerPage)
  const selfieSegmentationRef = useRef(null);
  const [isSegmentationLoaded, setIsSegmentationLoaded] = useState(false);
  const [segmentationMask, setSegmentationMask] = useState(null);
  const animationRef = useRef(null);

  // Person detection state (same as in PlayerPage)
  const modelRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedPerson, setDetectedPerson] = useState(null);

  // Load MediaPipe Selfie Segmentation (same as in PlayerPage)
  useEffect(() => {
    if (!scanning) return;

    const loadSegmentation = async () => {
      if (!window.SelfieSegmentation) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      if (window.SelfieSegmentation) {
        try {
          selfieSegmentationRef.current = new window.SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
          });

          selfieSegmentationRef.current.setOptions({
            modelSelection: 1,
            selfieMode: false
          });

          selfieSegmentationRef.current.onResults((results) => {
            setSegmentationMask(results.segmentationMask);
          });

          setIsSegmentationLoaded(true);
          console.log('Selfie segmentation loaded');
        } catch (err) {
          console.error('Failed to initialize MediaPipe SelfieSegmentation:', err);
        }
      } else {
        console.error('MediaPipe SelfieSegmentation library failed to load.');
      }
    };

    loadSegmentation();

    return () => {
      // Clean up segmentation if component unmounts
      if (selfieSegmentationRef.current) {
        selfieSegmentationRef.current.close();
      }
    };
  }, [scanning]);

  // Run segmentation on each frame when scanning
  useEffect(() => {
    if (!scanning || !isSegmentationLoaded || !videoRef.current || !selfieSegmentationRef.current) return;

    const runSegmentation = async () => {
      if (
        videoRef.current &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        await selfieSegmentationRef.current.send({ image: videoRef.current });
      }

      animationRef.current = requestAnimationFrame(runSegmentation);
    };

    runSegmentation();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scanning, isSegmentationLoaded]);

  // Draw segmentation mask to canvas
  useEffect(() => {
    if (!scanning || !segmentationMask || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply segmentation mask
    ctx.save();

    // Create a temporary canvas for the mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

    // Use the segmentation mask to clip the video
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(tempCanvas, 0, 0);

    // Add a green overlay to the masked area
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(0,255,0,0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Display username at the top
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#00ff00';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(username || 'Player', canvas.width / 2, 30);

    ctx.restore();
  }, [segmentationMask, username, scanning]);

  // Start camera when scanning begins
  useEffect(() => {
    if (scanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure camera permissions are enabled.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !segmentationMask) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!canvas || !video.videoWidth) return;

    // Get the current userId from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No userId found in localStorage');
      return;
    }

    // Create a data URL from the segmentation mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = segmentationMask.width;
    tempCanvas.height = segmentationMask.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(segmentationMask, 0, 0);

    // Get the segmentation data for reliable tracking
    const imageData = tempCanvas.toDataURL('image/png');

    // Store player face data with session-specific key (lobbyCode + userId)
    const sessionKey = `playerFaces_${lobbyCode}`;
    const playerFaces = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    playerFaces[userId] = {
      username,
      faceData: imageData,
      timestamp: Date.now() // Add timestamp for this session
    };
    localStorage.setItem(sessionKey, JSON.stringify(playerFaces));

    console.log(`Stored face data for session ${lobbyCode}, user ${username} (${userId})`);

    // Send face data and person detection data to server via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN && lobbyCode) {
      console.log('Sending face data and person detection to server for', username, 'with userId:', userId);

      const dataToSend = {
        type: 'store_face_data',
        faceData: imageData,
        lobbyCode,
        userId
      };

      // Include person detection data if available
      if (detectedPerson) {
        dataToSend.detectionData = {
          bbox: detectedPerson.bbox,
          confidence: detectedPerson.confidence,
          username: username,
          userId: userId,
          timestamp: Date.now()
        };
        console.log('Including person detection data:', dataToSend.detectionData);
      }

      ws.send(JSON.stringify(dataToSend));
    } else if (sendMessage && lobbyCode) {
      const dataToSend = {
        type: 'store_face_data',
        faceData: imageData,
        lobbyCode,
        userId
      };

      // Include person detection data if available
      if (detectedPerson) {
        dataToSend.detectionData = {
          bbox: detectedPerson.bbox,
          confidence: detectedPerson.confidence,
          username: username,
          userId: userId,
          timestamp: Date.now()
        };
        console.log('Including person detection data:', dataToSend.detectionData);
      }

      sendMessage(dataToSend);
    }

    // Update state and notify parent
    setScanComplete(true);
    stopCamera();

    if (onScanComplete) {
      onScanComplete(imageData);
    }
  };

  const handleStartScan = () => {
    setScanning(true);
    setScanComplete(false);
  };

  const handleRescan = () => {
    setScanComplete(false);
    setScanning(true);
  };

  // Load TensorFlow.js and COCO-SSD model (same as in PlayerPage)
  useEffect(() => {
    if (!scanning) return;

    async function loadModel() {
      try {
        if (!window.tf) {
          const tfScript = document.createElement('script');
          tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js';
          document.head.appendChild(tfScript);
          await new Promise((resolve, reject) => {
            tfScript.onload = resolve;
            tfScript.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
            setTimeout(() => reject(new Error('TensorFlow.js loading timeout')), 10000);
          });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!window.cocoSsd) {
          const cocoScript = document.createElement('script');
          cocoScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js';
          document.head.appendChild(cocoScript);
          await new Promise((resolve, reject) => {
            cocoScript.onload = resolve;
            cocoScript.onerror = () => reject(new Error('Failed to load COCO-SSD'));
            setTimeout(() => reject(new Error('COCO-SSD loading timeout')), 10000);
          });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        const model = await window.cocoSsd.load();
        modelRef.current = model;
        setIsModelLoaded(true);
        console.log('COCO-SSD model loaded for person detection');
      } catch (error) {
        console.error('Failed to load detection model:', error);
        setIsModelLoaded(false);
      }
    }
    loadModel();
  }, [scanning]);

  // Detect person in the video frame
  const detectPerson = async () => {
    if (!modelRef.current || !videoRef.current) return;
    try {
      const predictions = await modelRef.current.detect(videoRef.current);
      const personDetection = predictions.find(prediction => prediction.class === 'person');

      if (personDetection) {
        const detectedPersonData = {
          bbox: personDetection.bbox,
          confidence: personDetection.score,
          username: username,
          timestamp: Date.now()
        };
        setDetectedPerson(detectedPersonData);
        console.log('Detected person during scan:', detectedPersonData);
      } else {
        setDetectedPerson(null);
      }
    } catch (error) {
      console.error('Error detecting person:', error);
    }
  };

  // Run person detection periodically when scanning
  useEffect(() => {
    if (!scanning || !isModelLoaded) return;

    const detectionInterval = setInterval(() => {
      detectPerson();
    }, 200); // Detect every 200ms

    return () => clearInterval(detectionInterval);
  }, [scanning, isModelLoaded, username]);

  return (
    <div className="flex flex-col items-center space-y-4 rounded-lg bg-gray-800 p-4">
      <h3 className="text-xl font-semibold">Player Face Scan</h3>

      {!scanning && !scanComplete && (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-center text-gray-300">
            Scan your face to improve player detection during the game.
          </p>
          <Button
            onClick={handleStartScan}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Camera size={20} />
            <span>Start Scan</span>
          </Button>
        </div>
      )}

      {scanning && !scanComplete && (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative overflow-hidden rounded-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-64 max-h-64 w-full rounded-lg object-cover"
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!isSegmentationLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white">Loading segmentation...</p>
              </div>
            )}
            <div className="absolute left-0 top-0 h-full w-full border-4 border-indigo-500"></div>
          </div>
          <p className="text-sm text-gray-300">
            Position yourself in the frame until you see the green overlay.
          </p>
          <Button
            onClick={handleCapture}
            disabled={!isSegmentationLoaded || !segmentationMask}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50"
          >
            <Check size={20} />
            <span>Capture</span>
          </Button>
        </div>
      )}

      {scanComplete && (
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-lg border-2 border-green-500 p-1">
            <canvas 
              ref={canvasRef} 
              className="h-48 w-48 rounded-lg object-cover" 
            />
          </div>
          <p className="text-center text-green-400">
            <Check size={20} className="mr-2 inline" />
            Face scan complete!
          </p>
          <Button
            onClick={handleRescan}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
          >
            <RefreshCw size={20} />
            <span>Rescan</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlayerScan;