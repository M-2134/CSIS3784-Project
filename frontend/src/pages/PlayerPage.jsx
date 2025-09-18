import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HealthBar from '../components/HealthBar';
import Button from '../components/Button';
import { Zap, Crosshair, Timer, Menu, LogOut, Skull } from 'lucide-react';
import { useWebSocket } from '../WebSocketContext';

const PlayerPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Detection model refs and state
  const modelRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const nextPersonIdRef = useRef(1);
  const trackedPeopleRef = useRef([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedPeople, setDetectedPeople] = useState([]);

  // Add MediaPipe Selfie Segmentation integration
  const selfieSegmentationRef = useRef(null);
  const [isSegmentationLoaded, setIsSegmentationLoaded] = useState(false);
  const [segmentationMask, setSegmentationMask] = useState(null);

  // --- Game State ---
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(100);
  const [showHitIndicator, setShowHitIndicator] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [gameStarting, setGameStarting] = useState(false);
  const [startCountdown, setStartCountdown] = useState(3);

  // --- Sound Effects ---
  const hitSoundRef = useRef(null);
  const missSoundRef = useRef(null);

  // Initialize sounds
  useEffect(() => {
    hitSoundRef.current = new Audio('/sounds/laser-hit.mp3');
    missSoundRef.current = new Audio('/sounds/laser-miss.mp3');
    
    // Set volume to 70%
    hitSoundRef.current.volume = 0.7;
    missSoundRef.current.volume = 0.7;
    
    // Preload sounds
    hitSoundRef.current.preload = 'auto';
    missSoundRef.current.preload = 'auto';
    
    return () => {
      // Cleanup sounds
      hitSoundRef.current = null;
      missSoundRef.current = null;
    };
  }, []);

  // Play sound helper
  const playSound = (soundRef) => {
    if (!soundRef.current) return;
    try {
      soundRef.current.currentTime = 0; // Rewind to start
      soundRef.current.play();
    } catch (e) {
      console.log("Sound play error:", e);
    }
  };

  // --- Game Start Countdown ---
  useEffect(() => {
    if (gameStarting) {
      if (startCountdown > 0) {
        const timer = setTimeout(() => setStartCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameStarting(false);
      }
    }
  }, [gameStarting, startCountdown]);

  // --- Game Timer & WebSocket Logic ---
  useEffect(() => {
    let timerInterval;
    if (!isMenuOpen) {
      timerInterval = setInterval(() => {
        setGameTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerInterval);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [gameId, navigate, isMenuOpen]);

  // --- Use WebSocket from context ---
  const { ws, wsStatus } = useWebSocket();

  // Player identity state from server
  const [playerIdentities, setPlayerIdentities] = useState({});

  // Clear localStorage on component mount to prevent stale data from previous games
  useEffect(() => {
    console.log('🧹 CLEANUP: Clearing localStorage data from previous sessions');
    
    // Clear old face scan data from all previous sessions (keep only current session)
    const currentSessionKey = `playerFaces_${gameId}`;
    const currentIdentitiesKey = `playerIdentities_${gameId}`;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        // Clear old face scan data
        if (key.startsWith('playerFaces_') && key !== currentSessionKey) {
          console.log(`🧹 CLEANUP: Removing old face scan data: ${key}`);
          localStorage.removeItem(key);
        }
        // Clear old player identities data
        if (key.startsWith('playerIdentities_') && key !== currentIdentitiesKey) {
          console.log(`🧹 CLEANUP: Removing old player identities: ${key}`);
          localStorage.removeItem(key);
        }
        // Clear generic old keys
        if (key === 'playerIdentities' || key === 'lobbyPlayers') {
          console.log(`🧹 CLEANUP: Removing generic old data: ${key}`);
          localStorage.removeItem(key);
        }
      }
    }

    // Load existing player identities for this session if available
    const existingIdentities = localStorage.getItem(currentIdentitiesKey);
    if (existingIdentities) {
      try {
        const identities = JSON.parse(existingIdentities);
        console.log(`🎮 CLIENT: Restored player identities for session ${gameId}:`, identities);
        setPlayerIdentities(identities);
      } catch (error) {
        console.error('Error parsing stored player identities:', error);
      }
    }
  }, [gameId]);

  // Handle WebSocket messages
  useEffect(() => {
    console.log(`🎮 CLIENT: PlayerPage useEffect called. WebSocket status: ${wsStatus}, ws exists: ${!!ws}`);

    if (!ws) {
      console.log('🎮 CLIENT: No WebSocket connection available, waiting...');
      return;
    }

    console.log(`🎮 CLIENT: WebSocket readyState: ${ws.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
    if (ws.readyState !== WebSocket.OPEN) {
      console.log('🎮 CLIENT: WebSocket not ready, waiting for connection...');
      return;
    }

    // Request player identities from server when component mounts and WebSocket is ready
    if (gameId) {
      console.log('🎮 CLIENT: Requesting player identities for lobby:', gameId);
      ws.send(JSON.stringify({
        type: 'get_player_identities',
        lobbyCode: gameId
      }));
    }

    const messageHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🎮 CLIENT: Received WebSocket message:', data.type, data);

        // Handle player identities from server (when requested or updated)
        if (data.type === 'player_identities' || data.type === 'player_identities_updated') {
          console.log('🎮 CLIENT: Received player identities from server:', data.playerIdentities);
          if (data.playerIdentities) {
            setPlayerIdentities(data.playerIdentities);
            // Store for session continuity
            localStorage.setItem(`playerIdentities_${gameId}`, JSON.stringify(data.playerIdentities));
            console.log(`🎮 CLIENT: Updated player identities for lobby ${gameId}`);
          }
          return;
        }

        // Handle game_start message with player positions and identities
        if (data.type === 'game_start') {
          console.log('🎮 CLIENT: Received game start data:', data);
          console.log('🎮 CLIENT: Raw playerIdentities received:', JSON.stringify(data.playerIdentities, null, 2));

          // Clear any existing data first to avoid stale data issues
          console.log('🎮 CLIENT: Clearing any existing identity data');
          setPlayerIdentities({});
          localStorage.removeItem('playerIdentities');
          localStorage.removeItem('lobbyPlayers');

          if (data.playerPositions) {
            console.log('🎮 CLIENT: Received player positions:', data.playerPositions);
            localStorage.setItem('lobbyPlayers', JSON.stringify(data.playerPositions));
          }

          if (data.playerIdentities) {
            console.log('🎮 CLIENT: Received player identities:', data.playerIdentities);
            console.log('🎮 CLIENT: Player identities structure:', Object.keys(data.playerIdentities).map(key => ({
              position: key,
              username: data.playerIdentities[key].username,
              userId: data.playerIdentities[key].userId,
              hasDetectionData: !!data.playerIdentities[key].detectionData,
              detectionData: data.playerIdentities[key].detectionData
            })));
            localStorage.setItem('playerIdentities', JSON.stringify(data.playerIdentities));
            setPlayerIdentities(data.playerIdentities);

            // Pre-populate tracking with known identities instead of resetting completely
            console.log('🎮 CLIENT: Pre-populating person tracking with known identities');
            console.log('🎮 CLIENT: Available identities:', data.playerIdentities);

            // Set the next ID to be higher than the number of known identities
            const identityCount = Object.keys(data.playerIdentities).length;
            nextPersonIdRef.current = identityCount + 1;

            // Clear existing tracked people but don't reset everything
            trackedPeopleRef.current = [];
            setDetectedPeople([]);

            console.log(`🎮 CLIENT: Set next person ID to ${nextPersonIdRef.current} based on ${identityCount} known identities`);
          } else {
            // Fallback: If no playerIdentities received, try to create them from available data
            console.log('No playerIdentities received, creating from available data');

            // Try to get lobby members from localStorage or WebSocket data
            const lobbyPlayers = data.playerPositions || JSON.parse(localStorage.getItem('lobbyPlayers') || '{}');

            if (Object.keys(lobbyPlayers).length > 0) {
              console.log('Creating identities from lobby players:', lobbyPlayers);

              // Create a simple identity mapping from position to username
              const fallbackIdentities = {};
              Object.keys(lobbyPlayers).forEach(position => {
                fallbackIdentities[position] = {
                  username: lobbyPlayers[position],
                  userId: null // We don't have userId mapping in this fallback
                };
              });

              localStorage.setItem('playerIdentities', JSON.stringify(fallbackIdentities));
              setPlayerIdentities(fallbackIdentities);

              nextPersonIdRef.current = Object.keys(fallbackIdentities).length + 1;
              trackedPeopleRef.current = [];
              setDetectedPeople([]);

              console.log('Created fallback identities:', fallbackIdentities);
            }
          }
        }

        if (data.type === 'game_end') {
          navigate(`/game/${gameId}/end`);
        }
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    ws.addEventListener('message', messageHandler);

    // DON'T load identities from localStorage on component mount to avoid stale data
    // Instead, wait for fresh data from the game_start message
    console.log('🎮 CLIENT: PlayerPage mounted, waiting for fresh game_start data...');

    return () => {
      ws.removeEventListener('message', messageHandler);
    };
  }, [ws, navigate, gameId]);

  // Load TensorFlow.js and COCO-SSD model
  useEffect(() => {
    async function loadModel() {
      try {
        if (!window.tf) {
          const tfScript = document.createElement('script');
          tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js';
          document.head.appendChild(tfScript);
          await new Promise((resolve, reject) => {
            tfScript.onload = resolve;
            tfScript.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
            setTimeout(() => reject(new Error('TensorFlow.js loading timeout')), 30000);
          });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!window.cocoSsd) {
          const cocoScript = document.createElement('script');
          cocoScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js';
          document.head.appendChild(cocoScript);
          await new Promise((resolve, reject) => {
            cocoScript.onload = resolve;
            cocoScript.onerror = () => reject(new Error('Failed to load COCO-SSD'));
            setTimeout(() => reject(new Error('COCO-SSD loading timeout')), 30000);
          });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const model = await window.cocoSsd.load();
        modelRef.current = model;
        setIsModelLoaded(true);
      } catch (error) {
        setIsModelLoaded(false);
      }
    }
    loadModel();
  }, []);

  // Calculate distance between two bounding boxes
  const calculateDistance = useCallback((box1, box2) => {
    const centerX1 = box1[0] + box1[2] / 2;
    const centerY1 = box1[1] + box1[3] / 2;
    const centerX2 = box2[0] + box2[2] / 2;
    const centerY2 = box2[1] + box2[3] / 2;
    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }, []);

  // Calculate similarity between two bounding boxes using IoU (Intersection over Union)
  const calculateBboxSimilarity = useCallback((bbox1, bbox2) => {
    // bbox format: [x, y, width, height]
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;

    // Calculate intersection
    const xLeft = Math.max(x1, x2);
    const yTop = Math.max(y1, y2);
    const xRight = Math.min(x1 + w1, x2 + w2);
    const yBottom = Math.min(y1 + h1, y2 + h2);

    if (xRight < xLeft || yBottom < yTop) {
      return 0; // No intersection
    }

    const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
    const bbox1Area = w1 * h1;
    const bbox2Area = w2 * h2;
    const unionArea = bbox1Area + bbox2Area - intersectionArea;

    return intersectionArea / unionArea; // IoU
  }, []);

  // Enhanced similarity calculation with multiple factors
  const calculateEnhancedSimilarity = useCallback((storedBbox, currentBbox, storedConfidence, currentConfidence) => {
    // 1. IoU similarity (primary factor)
    const iouSimilarity = calculateBboxSimilarity(storedBbox, currentBbox);

    // 2. Size similarity - prefer similar sized bounding boxes
    const [, , w1, h1] = storedBbox;
    const [, , w2, h2] = currentBbox;
    const area1 = w1 * h1;
    const area2 = w2 * h2;
    const sizeSimilarity = Math.min(area1, area2) / Math.max(area1, area2);

    // 3. Aspect ratio similarity
    const ratio1 = w1 / h1;
    const ratio2 = w2 / h2;
    const aspectSimilarity = Math.min(ratio1, ratio2) / Math.max(ratio1, ratio2);

    // 4. Position similarity (center distance relative to image size)
    const centerX1 = storedBbox[0] + w1 / 2;
    const centerY1 = storedBbox[1] + h1 / 2;
    const centerX2 = currentBbox[0] + w2 / 2;
    const centerY2 = currentBbox[1] + h2 / 2;

    // Normalize distance by image diagonal (assuming 640x480 typical resolution)
    const imageDiagonal = Math.sqrt(640 * 640 + 480 * 480);
    const distance = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
    const normalizedDistance = Math.min(distance / imageDiagonal, 1);
    const positionSimilarity = 1 - normalizedDistance;

    // 5. Confidence factor - prefer high confidence detections
    const avgConfidence = (storedConfidence + currentConfidence) / 2;
    const confidenceFactor = Math.min(avgConfidence / 0.7, 1); // Scale to 1 at 70% confidence

    // Weighted combination of all factors
    const weights = {
      iou: 0.4,        // IoU is most important
      size: 0.2,       // Size similarity
      aspect: 0.15,    // Aspect ratio similarity  
      position: 0.15,  // Position similarity
      confidence: 0.1  // Confidence boost
    };

    const enhancedScore = 
      iouSimilarity * weights.iou +
      sizeSimilarity * weights.size +
      aspectSimilarity * weights.aspect +
      positionSimilarity * weights.position +
      confidenceFactor * weights.confidence;

    return {
      overall: enhancedScore,
      components: {
        iou: iouSimilarity,
        size: sizeSimilarity,
        aspect: aspectSimilarity,
        position: positionSimilarity,
        confidence: confidenceFactor
      }
    };
  }, [calculateBboxSimilarity]);

  // Track people across frames with username association
  const trackPeople = useCallback((newDetections) => {
    // For ongoing gameplay tracking, use simple distance-based matching
    // This is movement-tolerant since people will be moving around constantly
    const maxDistance = 150;
    const updatedPeople = [];
    const usedIndices = new Set();

    // First try to match existing tracked people (frame-to-frame tracking)
    trackedPeopleRef.current.forEach(trackedPerson => {
      let bestMatch = null;
      let bestDistance = Infinity;
      let bestIndex = -1;
      newDetections.forEach((detection, index) => {
        if (usedIndices.has(index)) return;
        // Simple distance-based tracking for gameplay movement
        const distance = calculateDistance(trackedPerson.bbox, detection.bbox);
        if (distance < bestDistance && distance < maxDistance) {
          bestDistance = distance;
          bestMatch = detection;
          bestIndex = index;
        }
      });
      if (bestMatch) {
        updatedPeople.push({
          ...trackedPerson,
          bbox: bestMatch.bbox,
          confidence: bestMatch.score,
          lastSeen: Date.now(),
          isVisible: true
        });
        usedIndices.add(bestIndex);
      } else {
        updatedPeople.push({
          ...trackedPerson,
          isVisible: false
        });
      }
    });

    // Try to match temporarily lost people
    newDetections.forEach((detection, index) => {
      if (usedIndices.has(index)) return;
      let matchedWithOldPerson = false;
      for (let i = 0; i < updatedPeople.length; i++) {
        const person = updatedPeople[i];
        if (!person.isVisible) {
          const timeSinceLastSeen = Date.now() - person.lastSeen;
          if (timeSinceLastSeen < 3000) {
            const distance = calculateDistance(person.bbox, detection.bbox);
            if (distance < 250) {
              updatedPeople[i] = {
                ...person,
                bbox: detection.bbox,
                confidence: detection.score,
                lastSeen: Date.now(),
                isVisible: true
              };
              usedIndices.add(index);
              matchedWithOldPerson = true;
              break;
            }
          }
        }
      }

      // Create a new person for this detection
      if (!matchedWithOldPerson) {
        // Try to find a username from player identities - improved logic with bbox matching
        let username = null;
        let userId = null;
        let assignedFromIdentity = false;
        let id = null;

        try {
          // First, try to find an unused identity from the available identities
          const availableIdentities = Object.keys(playerIdentities).length > 0 ? 
            playerIdentities : 
            {}; // Don't use localStorage fallback - only use current session data

          console.log('🔍 ASSIGNMENT: Available identities for assignment:', availableIdentities);
          console.log('🔍 ASSIGNMENT: Available identity positions:', Object.keys(availableIdentities));
          console.log('🔍 ASSIGNMENT: Available identity details:', Object.keys(availableIdentities).map(pos => ({
            position: pos,
            username: availableIdentities[pos].username,
            userId: availableIdentities[pos].userId,
            hasDetectionData: !!availableIdentities[pos].detectionData
          })));

          // NEW: Try bbox matching with stored scan data first
          if (!assignedFromIdentity && Object.keys(availableIdentities).length > 0) {
            console.log('🔍 BBOX: Attempting bbox matching for new detection:', detection.bbox);

            // Enhanced matching is used here for initial scan-to-game assignment
            // This is more strict since people should be relatively stationary during initial detection
            // (Note: Frame-to-frame tracking during gameplay uses simple distance matching above)

            // Get currently used identities by existing tracked people
            const usedUserIds = new Set(
              trackedPeopleRef.current
                .filter(p => p.userId)
                .map(p => p.userId)
            );

            console.log('🔍 BBOX: Currently used user IDs:', Array.from(usedUserIds));

            // Find the best bbox match among available identities
            let bestMatch = null;
            let bestSimilarity = 0;
            const minSimilarity = 0.4; // Increased minimum similarity threshold (40%)

            Object.keys(availableIdentities).forEach(pos => {
              const identity = availableIdentities[pos];

              // Skip if identity is already used
              if (identity.userId && usedUserIds.has(identity.userId)) {
                console.log(`🔍 BBOX: Skipping ${identity.username} (userId ${identity.userId}) - already used`);
                return;
              }

              // Check if this identity has detection data for bbox matching
              if (identity.detectionData && identity.detectionData.bbox) {
                const storedBbox = identity.detectionData.bbox;
                const currentBbox = detection.bbox;
                const storedConfidence = identity.detectionData.confidence || 0.5;
                const currentConfidence = detection.score || 0.5;

                // For initial scan-to-game matching, use enhanced similarity
                // This is more strict since people should be relatively stationary during initial detection
                const similarityResult = calculateEnhancedSimilarity(
                  storedBbox, 
                  currentBbox, 
                  storedConfidence, 
                  currentConfidence
                );

                console.log(`🔍 BBOX: Enhanced similarity between stored (${identity.username}) and current detection:`, {
                  overall: similarityResult.overall.toFixed(3),
                  iou: similarityResult.components.iou.toFixed(3),
                  size: similarityResult.components.size.toFixed(3),
                  aspect: similarityResult.components.aspect.toFixed(3),
                  position: similarityResult.components.position.toFixed(3),
                  confidence: similarityResult.components.confidence.toFixed(3)
                });

                if (similarityResult.overall > bestSimilarity && similarityResult.overall > minSimilarity) {
                  bestSimilarity = similarityResult.overall;
                  bestMatch = {
                    position: pos,
                    identity: identity,
                    similarity: similarityResult.overall,
                    components: similarityResult.components
                  };
                }
              } else {
                console.log(`🔍 BBOX: Identity ${identity.username} has no detection data for bbox matching`);
              }
            });

            if (bestMatch) {
              username = bestMatch.identity.username;
              userId = bestMatch.identity.userId;
              id = parseInt(bestMatch.position);
              assignedFromIdentity = true;
              console.log(`🎯 BBOX MATCH FOUND! Assigned ${username} based on enhanced similarity (${(bestMatch.similarity * 100).toFixed(1)}%)`);
              console.log(`🎯 BBOX COMPONENTS: IoU=${(bestMatch.components.iou * 100).toFixed(1)}%, Size=${(bestMatch.components.size * 100).toFixed(1)}%, Aspect=${(bestMatch.components.aspect * 100).toFixed(1)}%, Position=${(bestMatch.components.position * 100).toFixed(1)}%, Confidence=${(bestMatch.components.confidence * 100).toFixed(1)}%`);
            } else {
              console.log(`🔍 BBOX: No good enhanced matches found (best was ${(bestSimilarity * 100).toFixed(1)}%, needed ${(minSimilarity * 100).toFixed(1)}%), proceeding with normal assignment...`);
            }
          }

          if (!assignedFromIdentity && Object.keys(availableIdentities).length > 0) {
            console.log('🔄 FALLBACK: No bbox match, trying unused identity assignment...');

            // Get currently used identities by existing tracked people
            const usedUserIds = new Set(
              trackedPeopleRef.current
                .filter(p => p.userId)
                .map(p => p.userId)
            );

            console.log('🔄 FALLBACK: Currently used user IDs:', Array.from(usedUserIds));

            // Find an unused identity
            const unusedPosition = Object.keys(availableIdentities).find(pos => {
              const identity = availableIdentities[pos];
              // Check if identity has userId and it's not used, OR if it just has username and hasn't been assigned
              if (identity.userId) {
                const isUsed = usedUserIds.has(identity.userId);
                console.log(`🔄 FALLBACK: Checking identity ${identity.username} (userId: ${identity.userId}) - used: ${isUsed}`);
                return !isUsed;
              } else {
                // For identities without userId, check if the username hasn't been used
                const usedUsernames = new Set(
                  trackedPeopleRef.current
                    .filter(p => p.username && !p.username.startsWith('Player '))
                    .map(p => p.username)
                );
                const isUsed = identity.username && usedUsernames.has(identity.username);
                console.log(`🔄 FALLBACK: Checking identity ${identity.username} (no userId) - used: ${isUsed}`);
                return identity.username && !isUsed;
              }
            });

            if (unusedPosition) {
              const identity = availableIdentities[unusedPosition];
              username = identity.username;
              userId = identity.userId;
              id = parseInt(unusedPosition); // Use the position as the ID
              assignedFromIdentity = true;
              console.log(`🎯 FALLBACK SUCCESS: New detection assigned to ${username} (unused identity at position ${unusedPosition})`);
            } else {
              console.log('🔄 FALLBACK: No unused identities found');
            }
          }

          // If no unused identity found, create a new sequential ID
          if (!assignedFromIdentity) {
            id = nextPersonIdRef.current++;
            username = `Player ${id}`;
            console.log(`❌ GENERIC: No unused identity found, creating new player with ID ${id} (${username})`);
          }

          console.log(`🎯 FINAL ASSIGNMENT: Creating new person with username="${username}", userId="${userId}", id="${id}", assignedFromIdentity=${assignedFromIdentity}`);
        } catch (e) {
          console.error('Error getting identity for new detection:', e);
          id = nextPersonIdRef.current++;
          username = `Player ${id}`;
        }

        const newPerson = {
          id,
          username,
          userId,
          bbox: detection.bbox,
          confidence: detection.score,
          lastSeen: Date.now(),
          isVisible: true
        };

        console.log(`Created new person:`, newPerson);
        updatedPeople.push(newPerson);
        usedIndices.add(index);
      }
    });

    // Filter out people not seen for too long
    const currentTime = Date.now();
    const activePeople = updatedPeople.filter(person =>
      currentTime - person.lastSeen < 15000
    );
    trackedPeopleRef.current = activePeople;

    // Return only visible people
    return activePeople.filter(person => person.isVisible);
  }, [calculateDistance, calculateBboxSimilarity, playerIdentities]);

  // Function to enhance person detection using stored face data
  const enhancePersonDetection = useCallback((detectedPeople) => {
    if (!detectedPeople || detectedPeople.length === 0) return detectedPeople;

    try {
      // Get player identities from state (populated from server via WebSocket)
      if (Object.keys(playerIdentities).length > 0) {
        // Use identities from state (this is the fresh data from the current game session)
        console.log('🎮 CLIENT: Using identities from state (current session):', playerIdentities);
        console.log('🎮 CLIENT: Identity keys available:', Object.keys(playerIdentities));
        console.log('🎮 CLIENT: Identity details:', Object.keys(playerIdentities).map(key => ({
          position: key,
          username: playerIdentities[key].username,
          userId: playerIdentities[key].userId,
          hasDetectionData: !!playerIdentities[key].detectionData
        })));
        return mapDetectedPeopleToIdentities(detectedPeople, playerIdentities);
      } else {
        console.log('🎮 CLIENT: No player identities available for current session');
      }

      // Return the original people if no enhancements could be made
      console.log('No identity data available, returning unenhanced people with default names');
      return detectedPeople;
    } catch (e) {
      console.error("Error enhancing person detection:", e);
      return detectedPeople;
    }
  }, [playerIdentities]);

  // Helper function to map detected people to identities
  const mapDetectedPeopleToIdentities = useCallback((detectedPeople, identities) => {
    // Create a list of available identities that haven't been assigned yet
    const availableIdentities = { ...identities };
    const usedUserIds = new Set();

    // First pass: keep people who already have valid identities
    const enhancedPeople = detectedPeople.map(person => {
      if (person.userId && identities[person.userId] || 
          (person.username && !person.username.startsWith('Player '))) {
        if (person.userId) {
          usedUserIds.add(person.userId);
        }
        return person;
      }
      return person;
    });

    // Second pass: assign available identities to people without them
    enhancedPeople.forEach((person, index) => {
      if (!person.userId && person.username.startsWith('Player ')) {
        // Find an unused identity
        const unusedPosition = Object.keys(availableIdentities).find(pos => {
          const identity = availableIdentities[pos];
          return identity.userId && !usedUserIds.has(identity.userId);
        });

        if (unusedPosition) {
          const identity = availableIdentities[unusedPosition];
          enhancedPeople[index] = {
            ...person,
            username: identity.username,
            userId: identity.userId
          };
          usedUserIds.add(identity.userId);
          console.log(`Enhanced detection: assigned ${identity.username} to detected person`);
        } else {
          // Try positional mapping as fallback
          const positionId = String(person.id);
          if (identities[positionId]) {
            console.log(`Found identity for position ${positionId}:`, identities[positionId].username);
            enhancedPeople[index] = {
              ...person,
              username: identities[positionId].username,
              userId: identities[positionId].userId
            };
          }
        }
      }
    });

    return enhancedPeople;
  }, []);

  // Detect people in the video frame
  const detectPeople = useCallback(async () => {
    if (!modelRef.current || !videoRef.current) return;
    try {
      const predictions = await modelRef.current.detect(videoRef.current);
      const peopleDetections = predictions
        .filter(prediction => prediction.class === 'person')
        .map(prediction => ({
          bbox: prediction.bbox,
          score: prediction.score
        }));
      const trackedPeople = trackPeople(peopleDetections);
      const enhancedPeople = enhancePersonDetection(trackedPeople);
      setDetectedPeople(enhancedPeople);
    } catch (error) {}
  }, [trackPeople, enhancePersonDetection]);

  // Setup camera for the videoRef
  useEffect(() => {
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { console.error("Camera Error:", err); alert("Could not access camera."); }
    }
    enableCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Start detection when model is loaded and video is ready
  useEffect(() => {
    if (isModelLoaded && videoRef.current) {
      const startDetection = () => {
        detectionIntervalRef.current = setInterval(() => {
          detectPeople();
        }, 100); // Increase detection frequency to 10 FPS for smoother tracking
      };
      if (videoRef.current.readyState >= 2) {
        startDetection();
      } else {
        videoRef.current.addEventListener('loadeddata', startDetection);
      }
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isModelLoaded, detectPeople]);

  // Load MediaPipe Selfie Segmentation
  useEffect(() => {
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
        } catch (err) {
          alert('Failed to initialize MediaPipe SelfieSegmentation.');
        }
      } else {
        alert('MediaPipe SelfieSegmentation library failed to load.');
      }
    };
    loadSegmentation();
  }, []);

  // Run segmentation on each frame
  useEffect(() => {
    let animationId;
    const runSegmentation = async () => {
      if (
        isSegmentationLoaded &&
        videoRef.current &&
        selfieSegmentationRef.current &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        await selfieSegmentationRef.current.send({ image: videoRef.current });
      }
      animationId = requestAnimationFrame(runSegmentation);
    };
    if (isSegmentationLoaded) {
      runSegmentation();
    }
    return () => cancelAnimationFrame(animationId);
  }, [isSegmentationLoaded]);

  // Setup canvas sizing with ResizeObserver
  useEffect(() => {
    const setupCanvasSize = () => {
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        const rect = video.getBoundingClientRect();
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    setupCanvasSize();

    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(() => {
        setupCanvasSize();
      });
      
      if (videoRef.current) {
        resizeObserverRef.current.observe(videoRef.current);
      }
    }

    const handleResize = () => setupCanvasSize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Draw segmentation mask with proper video cropping handling
  useEffect(() => {
    if (canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;
      
      const videoRect = video.getBoundingClientRect();
      
      const videoAspect = video.videoWidth / video.videoHeight;
      const displayAspect = videoRect.width / videoRect.height;
      
      let sourceX = 0, sourceY = 0, sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
      let destX = 0, destY = 0, destWidth = canvas.width, destHeight = canvas.height;
      
      if (displayAspect > videoAspect) {
        const newHeight = video.videoWidth / displayAspect;
        sourceY = (video.videoHeight - newHeight) / 2;
        sourceHeight = newHeight;
      } else {
        const newWidth = video.videoHeight * displayAspect;
        sourceX = (video.videoWidth - newWidth) / 2;
        sourceWidth = newWidth;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (segmentationMask) {
        ctx.save();
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        tempCtx.drawImage(
          segmentationMask,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        );
        
        ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,
          destX, destY, destWidth, destHeight
        );
        
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(tempCanvas, 0, 0);
        
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(0,255,0,0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.restore();
        
        if (detectedPeople && detectedPeople.length > 0) {
          detectedPeople.forEach(person => {
            const [x, y, width, height] = person.bbox;
            
            const scaleX = canvas.width / sourceWidth;
            const scaleY = canvas.height / sourceHeight;
            const labelX = (x - sourceX) * scaleX + width * scaleX / 2;
            const labelY = (y - sourceY) * scaleY - 10;
            
            if (labelX >= 0 && labelX <= canvas.width && labelY >= -30 && labelY <= canvas.height) {
              ctx.fillStyle = '#00ff00';
              ctx.font = '20px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(person.username || `Player ${person.id}`, labelX, labelY);
            }
          });
        }
      } else if (detectedPeople && detectedPeople.length > 0) {
        detectedPeople.forEach(person => {
          const [x, y, width, height] = person.bbox;
          
          const scaleX = canvas.width / sourceWidth;
          const scaleY = canvas.height / sourceHeight;
          
          const scaledX = (x - sourceX) * scaleX;
          const scaledY = (y - sourceY) * scaleY;
          const scaledWidth = width * scaleX;
          const scaledHeight = height * scaleY;
          
          if (scaledX + scaledWidth >= 0 && scaledX <= canvas.width && 
              scaledY + scaledHeight >= 0 && scaledY <= canvas.height) {
            
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
            // Measure text width to create proper background
            ctx.font = '16px Arial';
            const username = person.username || `Player ${person.id}`;
            const textWidth = ctx.measureText(username).width + 10; // Add 10px padding

            ctx.fillStyle = '#00ff00';
            ctx.fillRect(scaledX, scaledY - 25, textWidth, 25);
            ctx.fillStyle = '#000000';
            ctx.fillText(username, scaledX + 5, scaledY - 8);
          }
        });
      }
    }
  }, [detectedPeople, segmentationMask]);

  // --- Reload State ---
  const [isReloading, setIsReloading] = useState(false);
  const [reloadOffset, setReloadOffset] = useState(251.2);
  const [circleTransition, setCircleTransition] = useState('none');
  const CIRCLE_CIRCUMFERENCE = 251.2; // 2 * PI * 40

  useEffect(() => {
    let offsetTimer;
    if (isReloading) {
      // Start animation from full to empty
      setCircleTransition('stroke-dashoffset 2s linear');
      offsetTimer = setTimeout(() => {
        setReloadOffset(0);
      }, 10);
    } else {
      // Wait for the animation to finish before resetting the offset (so it doesn't snap back during the reload)
      offsetTimer = setTimeout(() => {
        setCircleTransition('none');
        setReloadOffset(CIRCLE_CIRCUMFERENCE);
      }, 200); // Wait a short moment after reload ends before resetting
    }
    return () => {
      clearTimeout(offsetTimer);
    };
  }, [isReloading, CIRCLE_CIRCUMFERENCE]);

  // --- Event Handlers ---
  // Using personId for now
  // Will add in functionality for it later
  const handlePlayerHit = (personId) => {
    setShowHitIndicator('hit');
    setScore(s => {
      // Use playerClass from localStorage if available
      let classFromStorage = localStorage.getItem('playerClass');
      let classToUse = (classFromStorage ? classFromStorage.toLowerCase() : 'pistol');
      let increment = 10;
      if (classToUse === 'archer') increment = 70;
      else if (classToUse === 'shotgun') increment = 40;
      // pistol is 10
      const newScore = s + increment;
      
      return newScore;
    });
  };

  // Updated hit detection with proper coordinate transformation
  const handleShoot = () => {
    if (health <= 0 || isMenuOpen || isReloading || gameStarting) return;
    // Vibrate on every shot (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }
    setIsReloading(true);
    // Add code for the reload duration
    let classFromStorage = localStorage.getItem('playerClass');
    let increment = 1;
    if (classFromStorage === 'archer') increment = 7;
    else if (classFromStorage === 'shotgun') increment = 4;
    setTimeout(() => setIsReloading(false), increment * 1000); // 2 seconds reload
    let hit = false;

    if (segmentationMask && detectedPeople.length > 0 && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const videoRect = video.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const displayCenterX = canvasRect.left + canvasRect.width / 2;
      const displayCenterY = canvasRect.top + canvasRect.height / 2;
      const videoAspect = video.videoWidth / video.videoHeight;
      const displayAspect = canvasRect.width / canvasRect.height;
      let sourceX = 0, sourceY = 0, sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
      if (displayAspect > videoAspect) {
        const newHeight = video.videoWidth / displayAspect;
        sourceY = (video.videoHeight - newHeight) / 2;
        sourceHeight = newHeight;
      } else {
        const newWidth = video.videoHeight * displayAspect;
        sourceX = (video.videoWidth - newWidth) / 2;
        sourceWidth = newWidth;
      }
      const relX = (displayCenterX - canvasRect.left) / canvasRect.width;
      const relY = (displayCenterY - canvasRect.top) / canvasRect.height;
      const videoX = sourceX + relX * sourceWidth;
      const videoY = sourceY + relY * sourceHeight;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(segmentationMask, 0, 0, video.videoWidth, video.videoHeight);
      const maskData = tempCtx.getImageData(Math.floor(videoX), Math.floor(videoY), 1, 1).data;
      if (maskData[3] > 128 && (maskData[0] > 128 || maskData[1] > 128 || maskData[2] > 128)) {
        let minDist = Infinity;
        let hitPerson = null;
        detectedPeople.forEach(person => {
          const [x, y, width, height] = person.bbox;
          const px = x + width / 2;
          const py = y + height / 2;
          const dist = Math.sqrt(Math.pow(videoX - px, 2) + Math.pow(videoY - py, 2));
          if (dist < minDist) {
            minDist = dist;
            hitPerson = person;
          }
        });
        if (hitPerson) {
          playSound(hitSoundRef);
          handlePlayerHit(hitPerson.id);
          hit = true;
        }
      }
    } else if (detectedPeople.length > 0 && videoRef.current) {
      const video = videoRef.current;
      const videoRect = video.getBoundingClientRect();
      const videoAspect = video.videoWidth / video.videoHeight;
      const displayAspect = videoRect.width / videoRect.height;
      let sourceX = 0, sourceY = 0, sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
      if (displayAspect > videoAspect) {
        const newHeight = video.videoWidth / displayAspect;
        sourceY = (video.videoHeight - newHeight) / 2;
        sourceHeight = newHeight;
      } else {
        const newWidth = video.videoHeight * displayAspect;
        sourceX = (video.videoWidth - newWidth) / 2;
        sourceWidth = newWidth;
      }
      const centerX = sourceX + sourceWidth / 2;
      const centerY = sourceY + sourceHeight / 2;
      const hitPerson = detectedPeople.find(person => {
        const [x, y, width, height] = person.bbox;
        return centerX >= x && centerX <= (x + width) && centerY >= y && centerY <= (y + height);
      });
      if (hitPerson) {
        playSound(hitSoundRef);
        handlePlayerHit(hitPerson.id);
        hit = true;
      }
    }
    if (!hit) {
      playSound(missSoundRef);
      setShowHitIndicator('miss');
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'miss'}));
      }
    } else {
      if (ws && ws.readyState === 1) {
        console.log("Sending hit event to server");
        ws.send(JSON.stringify({ type: 'hit'}));
      }
    }
  };

  const handleSuicide = () => {
    setHealth(0);
    setIsMenuOpen(false);
  };

  const handleQuit = () => {
    navigate('/');
  };

  // --- Other Effects ---
  useEffect(() => {
    if (showHitIndicator) {
      const t = setTimeout(() => setShowHitIndicator(false), 500);
      return () => clearTimeout(t);
    }
  }, [showHitIndicator]);
  
  // useEffect(() => { 
  //   if (health <= 0) { 
  //     setTimeout(() => navigate(`/game/${gameId}/end`), 1500); 
  //   } 
  // }, [health, gameId, navigate]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // State to show a player's name when they first appear
  const [newPlayerName, setNewPlayerName] = useState(null);

  // Track when new players appear in the game
  useEffect(() => {
    if (!detectedPeople || detectedPeople.length === 0) return;

    // Get the usernames of all detected people
    const currentUsernames = detectedPeople
      .filter(p => p.username && !p.username.startsWith('Player '))
      .map(p => p.username);

    if (currentUsernames.length > 0) {
      // Show the first real username we find
      setNewPlayerName(currentUsernames[0]);

      // Clear the name after 3 seconds
      const timer = setTimeout(() => {
        setNewPlayerName(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [detectedPeople]);

  // Cleanup effect to clear identity data when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎮 CLIENT: PlayerPage unmounting, clearing identity data');
      // Optional: Clear localStorage to prevent stale data in future sessions
      // localStorage.removeItem('playerIdentities');
      // localStorage.removeItem('lobbyPlayers');
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <video ref={videoRef} className={`h-full w-full object-cover ${isMenuOpen ? 'blur-sm' : ''}`} autoPlay playsInline muted />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{zIndex: 1}} />
      {/* --- Crosshair Overlay --- */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
        <div className="w-16 h-16 relative flex items-center justify-center">
          <div className="absolute left-1/2 top-0 w-0.5 h-4 bg-red-500" style={{transform: 'translateX(-50%)'}}></div>
          <div className="absolute left-1/2 bottom-0 w-0.5 h-4 bg-red-500" style={{transform: 'translateX(-50%)'}}></div>
          <div className="absolute top-1/2 left-0 h-0.5 w-4 bg-red-500" style={{transform: 'translateY(-50%)'}}></div>
          <div className="absolute top-1/2 right-0 h-0.5 w-4 bg-red-500" style={{transform: 'translateY(-50%)'}}></div>
          <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-white/80"></div>
        </div>
      </div>
      {/* --- Overlays --- */}
      {gameStarting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
          <h2 className="text-5xl font-black text-white mb-4">Game Starting</h2>
          <div className="text-6xl font-extrabold text-emerald-400 animate-bounce-in">{startCountdown > 0 ? startCountdown : 'GO!'}</div>
        </div>
      )}
      {showHitIndicator === 'hit' && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><h2 className="animate-ping-once text-5xl font-black text-white drop-shadow-lg">HIT</h2></div>}
      {showHitIndicator === 'miss' && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><h2 className="animate-ping-once text-5xl font-black text-red-400 drop-shadow-lg">MISS</h2></div>}
      {health <= 0 && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 text-red-500"><h1 className="text-6xl font-black">ELIMINATED</h1></div>}

      {/* Show player detection notification */}
      {newPlayerName && (
        <div className="pointer-events-none absolute top-20 left-1/2 transform -translate-x-1/2 z-20 animate-fade-in">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <span className="mr-2">👤</span>
            <span className="font-bold">{newPlayerName}</span>
            <span className="ml-2">detected!</span>
          </div>
        </div>
      )}

      {/* New player notification */}
      {newPlayerName && (
        <div className="pointer-events-none absolute bottom-32 left-0 right-0 z-20 flex items-center justify-center">
          <div className="animate-fade-in-out rounded-lg bg-black/70 px-6 py-3 text-center">
            <span className="text-lg font-bold text-white">
              {newPlayerName} has entered the game!
            </span>
          </div>
        </div>
      )}
      
      {/* --- Game Menu Modal --- */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-center text-2xl font-bold">Game Menu</h2>
            <Button onClick={() => setIsMenuOpen(false)}>Resume Game</Button>
            <Button onClick={handleSuicide} className="flex items-center justify-center gap-2 bg-yellow-700 hover:bg-yellow-600">
              <Skull size={20} /><span>Commit Suicide</span>
            </Button>
            <Button onClick={handleQuit} className="flex items-center justify-center gap-2 bg-red-800 hover:bg-red-700">
              <LogOut size={20} /><span>Quit to Main Menu</span>
            </Button>
          </div>
        </div>
      )}

      {/* --- Main HUD --- */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-black/50 p-2 backdrop-blur-sm"><Timer size={20} /><span className="text-xl font-bold">{formatTime(gameTime)}</span></div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end rounded-lg bg-black/50 p-2 text-right backdrop-blur-sm"><span className="text-xs font-bold uppercase">Score</span><span className="text-2xl font-black">{score}</span></div>
          </div>
          <button onClick={() => setIsMenuOpen(true)} className="rounded-lg bg-black/50 p-2 backdrop-blur-sm"><Menu size={24} /></button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={handleShoot} 
            disabled={health <= 0 || isMenuOpen || gameStarting || isReloading}
            className={`
              flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/50
              text-white transition-transform active:scale-90 disabled:cursor-not-allowed
              relative
              ${isReloading ? 'bg-gray-700/80' : 'bg-red-600/80'}
            `}
          >
            {isReloading ? (
              <>
                {/* SVG for circular progress animation */}
                <svg className="absolute top-0 left-0 h-full w-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    className="stroke-current text-white/20"
                    strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"
                  />
                  <circle
                    className="stroke-current text-red-500"
                    strokeWidth="8"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={reloadOffset}
                    strokeLinecap="round"
                    cx="50" cy="50" r="40" fill="transparent"
                    style={{ transition: circleTransition }}
                  />
                </svg>
                {/* Text content centered on top of the animation */}
                <div className="relative z-10 flex h-full w-full items-center justify-center">
                    <span className="text-lg font-bold animate-pulse">RELOADING...</span>
                </div>
              </>
            ) : (
              <Crosshair size={48} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;