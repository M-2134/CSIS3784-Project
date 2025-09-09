const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 8080;

// Player storage
let players = {}; // key: userId, value: { ws, username, role, ready, score }
let gameStarted = false;
let gameTimer = null;

// Lobby storage
let lobbies = {};
// Store face scan data for each lobby
const lobbyFaceData = {};

function broadcast(type, payload) {
    const message = JSON.stringify({ type, ...payload });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function updateLobbyStatus() {
    const lobbyStatus = Object.entries(players)
        .filter(([userId, p]) => userId && p.username && p.username.trim())
        .map(([userId, p]) => ({
            userId,
            username: p.username,
            role: p.role,
            ready: p.ready || false,
            score: p.score || 0,
            class: p.class || "pistol"
        }));
    broadcast("lobby_status", { players: lobbyStatus });
}

function endGame() {
    if (gameStarted) {
        gameStarted = false;
        if (gameTimer) clearTimeout(gameTimer);
        gameTimer = null;
        // Send game_end to all players in all lobbies
        Object.values(lobbies).forEach(lobby => {
            broadcastToLobby(lobby.code, "game_end", { message: "Game has ended!" });
        });
        setTimeout(() => {
            updateLobbyStatus();
        }, 3000);
    }
}

function tryStartGame() {
    const readyPlayers = Object.values(players).filter(p => p.role === 'player' && p.ready);
    if (!gameStarted && readyPlayers.length >= 2) {
        gameStarted = true;

        // Find the lobby code for these players
        let lobbyCode = null;
        for (const [code, lobby] of Object.entries(lobbies)) {
            if (lobby.players.some(playerId => readyPlayers.some(p => p.id === playerId))) {
                lobbyCode = code;
                break;
            }
        }

        // Prepare player identities from stored face data
        let playerIdentities = {};
        if (lobbyCode && lobbyFaceData[lobbyCode]) {
            playerIdentities = lobbyFaceData[lobbyCode];
        }

        console.log(`Game starting in lobby ${lobbyCode} with player identities:`, playerIdentities);

        if (lobbyCode) {
            broadcastToLobby(lobbyCode, "game_start", {
                message: "Game has started!",
                playerIdentities: playerIdentities,
                lobbyCode: lobbyCode
            });
        } else {
            // Fallback to global broadcast if no lobby found
            broadcast("game_start", { message: "Game has started!" });
        }

        // Start timer
        gameTimer = setTimeout(endGame, 100000);
        return true;
    }
    return false;
}

function generateLobbyCode() {
    // 6-character alphabetic code (A-Z)
    let code = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createLobby(hostUserId, maxPlayers = 8, name = "Lobby", playerClass = "pistol") {
    const code = generateLobbyCode();
    lobbies[code] = {
        code,
        host: hostUserId,
        players: [hostUserId],
        maxPlayers: Math.min(Math.max(maxPlayers, 2), 8), // Ensure maxPlayers is between 2 and 8
        name,
        createdAt: Date.now()
    };
    players[hostUserId].lobbyCode = code;
    players[hostUserId].isHost = true; // Mark player as host
    players[hostUserId].ready = false; // Initialize ready state
    players[hostUserId].role = 'player'; // Set role to player when creating a lobby
    players[hostUserId].class = playerClass; // Set player class
    console.log(`Lobby created: code=${code}, host=${hostUserId}, maxPlayers=${maxPlayers}, name=${name}, class=${playerClass}`);
    return code;
}

function joinLobby(userId, code, playerClass = "pistol") {
    // Convert code to uppercase for case-insensitive matching
    code = code.toUpperCase();

    if (lobbies[code] && lobbies[code].players.length < lobbies[code].maxPlayers) {
        // Check if player is already in the lobby
        if (lobbies[code].players.includes(userId)) {
            console.log(`User ${userId} is already in lobby ${code}`);
            return true; // Return true as they're already in the lobby
        }

        lobbies[code].players.push(userId);
        players[userId].lobbyCode = code;
        players[userId].isHost = false; // Not the host
        players[userId].ready = false; // Initialize ready state
        players[userId].role = 'player'; // Set role to player when joining a lobby
        players[userId].class = playerClass;

        // Print to console
        console.log(`User ${userId} joined lobby ${code} as class ${playerClass}`);

        // Broadcast updated lobby members to all clients in the same lobby
        setTimeout(() => {
            broadcastToLobby(code, "lobby_members", {
                code,
                members: lobbies[code].players.map(uid => ({
                    userId: uid,
                    username: players[uid]?.username || null,
                    isHost: lobbies[code].host === uid,
                    isReady: players[uid]?.ready || false,
                    class: players[uid]?.class || "pistol"
                }))
            });
        }, 2000);
        broadcastToLobby(code, "lobby_members", {
            code,
            members: lobbies[code].players.map(uid => ({
                userId: uid,
                username: players[uid]?.username || null,
                isHost: lobbies[code].host === uid,
                isReady: players[uid]?.ready || false,
                class: players[uid]?.class || "pistol"
            }))
        });
        return true;
    }
    return false;
}

// Helper function to broadcast to all users in a specific lobby
function broadcastToLobby(lobbyCode, type, payload) {
    if (!lobbies[lobbyCode]) return;

    const message = JSON.stringify({ type, ...payload });
    lobbies[lobbyCode].players.forEach(userId => {
        const player = players[userId];
        if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }
    });
}

function showLobbies() {
    // Send all lobbies to all connected clients
    const lobbyList = Object.values(lobbies).map(lobby => {
        const playerNames = lobby.players.map(uid => players[uid]?.username || uid);
        console.log(`Lobby ${lobby.code} (${lobby.name}): Players: [${playerNames.join(', ')}]`);
        return {
            code: lobby.code,
            host: lobby.host,
            name: lobby.name,
            playerCount: lobby.players.length
        };
    });
    broadcast("lobby_list", { lobbies: lobbyList });
}

wss.on('connection', function connection(ws) {
    const userId = Math.random().toString(36).substring(2, 9);

    players[userId] = { ws, role: 'spectator', ready: false, score: 0 };

    // On first connection, create a default lobby if none exists
    if (Object.keys(lobbies).length === 0) {
        createLobby(userId, 8, "BBDefault"); // Default lobby with name BBDefault
        showLobbies();
    }

    console.log(`Client ${userId} connected`);
    ws.send(JSON.stringify({ type: 'welcome', userId }));

    ws.on('message', function incoming(message) {
        let data;
        try {
            data = JSON.parse(message);
        } catch (err) {
            console.error("Invalid JSON:", message);
            return;
        }

        const player = players[userId];
        if (!player) return;

        switch (data.type) {
            case 'create_lobby': {
                const maxPlayers = typeof data.maxPlayers === 'number' && data.maxPlayers > 4 ? data.maxPlayers : 8;
                const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : "Lobby";
                const playerClass = ["archer", "pistol", "shotgun"].includes(data.class) ? data.class : "pistol";
                if (typeof data.username === 'string' && data.username.trim()) {
                    player.username = data.username.trim();
                }
                const code = createLobby(userId, maxPlayers, name, playerClass);
                ws.send(JSON.stringify({ type: 'lobby_created', code, maxPlayers, name, class: playerClass }));
                showLobbies();
                break;
            }
            case 'join_lobby': {
                console.log('Received join_lobby request:', data); // ADDED LOG
                if (typeof data.username === 'string' && data.username.trim()) {
                    player.username = data.username.trim();
                }
                const code = data.code.toUpperCase();
                const playerClass = ["archer", "pistol", "shotgun"].includes(data.class) ? data.class : "pistol";
                if (!lobbies[code]) {
                    console.log('Lobby not found for code:', code); // ADDED LOG
                    ws.send(JSON.stringify({ type: 'lobby_error', message: 'Lobby not found' }));
                    break;
                }
                if (lobbies[code].players.length >= lobbies[code].maxPlayers) {
                    console.log('Lobby is full for code:', code); // ADDED LOG
                    ws.send(JSON.stringify({ type: 'lobby_error', message: 'Lobby is full' }));
                    break;
                }
                if (joinLobby(userId, code, playerClass)) {
                    player.role = 'player'; // Set role to player when joining a lobby
                    player.class = playerClass;
                    console.log('Sending lobby_joined for code:', code, 'to user:', userId); // ADDED LOG
                    ws.send(JSON.stringify({
                        type: 'lobby_joined',
                        code,
                        lobbyName: lobbies[code].name,
                        isHost: lobbies[code].host === userId,
                        class: playerClass
                    }));

                    // Delay showLobbies to ensure lobby_joined is processed first
                    setTimeout(() => {
                        showLobbies();
                    }, 300); // 100ms delay
                } else {
                    console.log('Could not join lobby for code:', code, 'user:', userId); // ADDED LOG
                    ws.send(JSON.stringify({ type: 'lobby_error', message: 'Could not join lobby' }));
                }
                break;
            }
            case 'show_lobbies': {
                showLobbies();
                break;
            }

            case 'join':
                player.role = data.role === 'player' ? 'player' : 'spectator';
                player.username = data.username || null;
                player.ready = false;
                player.score = 0;
                console.log(`${userId} joined as ${player.role}`);
                updateLobbyStatus();
                break;

            case 'ready':
                if (player.role === 'player') {
                    player.ready = true;
                    console.log(`${player.username || userId} is ready`);
                    updateLobbyStatus();
                    tryStartGame();
                }
                break;

            case 'score':
                if (player.role === 'player') {
                    player.score = data.score || 0;
                    updateLobbyStatus(); // Optional: could throttle this
                }
                break;

            case 'get_lobby_members': {
                const code = data.code || player.lobbyCode;
                if (lobbies[code]) {
                    const memberList = lobbies[code].players.map(uid => ({
                        userId: uid,
                        username: players[uid]?.username || null,
                        isHost: lobbies[code].host === uid,
                        isReady: players[uid]?.ready || false,
                        class: players[uid]?.class || "pistol"
                    }));
                    // Only send to the requesting client
                    ws.send(JSON.stringify({ type: 'lobby_members', code, members: memberList }));
                    console.log('Sent lobby members for code:', code, 'members:', memberList);
                } else {
                    ws.send(JSON.stringify({ type: 'lobby_error', message: 'Lobby not found' }));
                }
                break;
            }

            case 'set_ready': {
                // Handle ready/unready toggle from frontend
                const code = data.code || player.lobbyCode;
                if (!code || !lobbies[code]) {
                    console.log('Cannot set ready: lobby not found', code);
                    ws.send(JSON.stringify({ type: 'lobby_error', message: 'Lobby not found' }));
                    break;
                }

                if (typeof data.ready === 'boolean') {
                    player.ready = data.ready;
                    console.log(`${player.username || userId} set ready: ${data.ready} in lobby ${code}`);

                    // Broadcast updated lobby members to all clients in the same lobby
                    const memberList = lobbies[code].players.map(uid => ({
                        userId: uid,
                        username: players[uid]?.username || null,
                        isHost: lobbies[code].host === uid,
                        isReady: players[uid]?.ready || false,
                        class: players[uid]?.class || "pistol"
                    }));
                    broadcastToLobby(code, "lobby_members", { code, members: memberList });

                    // Check if all players are ready and we have at least 2 players
                    const allReady = lobbies[code].players.every(uid => players[uid]?.ready);
                    const enoughPlayers = lobbies[code].players.length >= 2;

                    if (allReady && enoughPlayers && !gameStarted) {
                        // Remove null/unnamed users before starting the game
                        removeNullUsersFromLobby(code);
                        // Start countdown for game start
                        console.log(`All players ready in lobby ${code}, starting countdown`);
                        broadcastToLobby(code, "game_start_countdown", { countdown: 3 });

                        // After 3 seconds, start the game
                        setTimeout(() => {
                            if (lobbies[code]) {
                                tryStartGame();
                                gameStarted = true;
                                console.log(`Game started in lobby ${code}`);
                            }
                        }, 3000);
                    }
                } else {
                    console.log('Invalid ready value received:', data.ready);
                }
                break;
            }
            case 'hit':

                // Increase score by 50 if weapon is gun
                if (player.class === 'pistol') {
                    player.score = (player.score || 0) + 10;
                }
                else if (player.class === 'shotgun') {
                    player.score = (player.score || 0) + 40;
                }
                else if (player.class === 'archer') {
                    player.score = (player.score || 0) + 70;
                }
                updateLobbyStatus();
                break;
            case 'miss':
                // No action for miss for now
                break;
            case 'get_lobby_status': {
                // Respond with the current lobby's player list and scores
                let code = data.gameId || player.lobbyCode;
                if (code && lobbies[code]) {
                    const playerList = lobbies[code].players.map(uid => ({
                        id: uid,
                        name: players[uid]?.username || null,
                        score: players[uid]?.score || 0
                    }));
                    ws.send(JSON.stringify({ type: 'lobby_status', players: playerList }));
                } else {
                    ws.send(JSON.stringify({ type: 'lobby_status', players: [] }));
                }
                break;
            }

            case 'store_face_data': {
                // Store face scan data for a player in a specific lobby
                const { faceData, lobbyCode, userId: scanUserId, detectionData } = data;

                if (!lobbyCode || !scanUserId || !faceData) {
                    console.error('Missing required face data fields:', { lobbyCode, scanUserId, hasFaceData: !!faceData });
                    break;
                }

                // Initialize lobby face data if not exists
                if (!lobbyFaceData[lobbyCode]) {
                    lobbyFaceData[lobbyCode] = {};
                }

                // Store the face scan data
                lobbyFaceData[lobbyCode][scanUserId] = {
                    faceData,
                    username: players[scanUserId]?.username || 'Unknown',
                    timestamp: Date.now(),
                    detectionData: detectionData || null
                };

                console.log(`Stored face data for user ${scanUserId} (${players[scanUserId]?.username}) in lobby ${lobbyCode}`);

                // Broadcast updated player identities to all clients in the lobby
                if (lobbies[lobbyCode]) {
                    const playerIdentities = {};
                    lobbies[lobbyCode].players.forEach(uid => {
                        if (lobbyFaceData[lobbyCode] && lobbyFaceData[lobbyCode][uid]) {
                            playerIdentities[uid] = {
                                username: players[uid]?.username || 'Unknown',
                                faceData: lobbyFaceData[lobbyCode][uid].faceData,
                                detectionData: lobbyFaceData[lobbyCode][uid].detectionData
                            };
                        }
                    });

                    broadcastToLobby(lobbyCode, "player_identities_updated", {
                        playerIdentities,
                        lobbyCode
                    });
                }
                break;
            }

            case 'get_player_identities': {
                // Send current player identities for a lobby
                const { lobbyCode: requestedLobbyCode } = data;
                const code = requestedLobbyCode || player.lobbyCode;

                if (code && lobbies[code] && lobbyFaceData[code]) {
                    const playerIdentities = {};
                    lobbies[code].players.forEach(uid => {
                        if (lobbyFaceData[code][uid]) {
                            playerIdentities[uid] = {
                                username: players[uid]?.username || 'Unknown',
                                faceData: lobbyFaceData[code][uid].faceData,
                                detectionData: lobbyFaceData[code][uid].detectionData
                            };
                        }
                    });

                    ws.send(JSON.stringify({
                        type: 'player_identities',
                        playerIdentities,
                        lobbyCode: code
                    }));
                    console.log(`Sent player identities for lobby ${code} to user ${userId}`);
                } else {
                    ws.send(JSON.stringify({
                        type: 'player_identities',
                        playerIdentities: {},
                        lobbyCode: code
                    }));
                }
                break;
            }

            default:
                console.warn("Unknown message type:", data.type);
        }
    });

    ws.on('close', () => {
        console.log(`Client ${userId} disconnected`);
        // Clean up player from lobbies when they disconnect
        if (player.lobbyCode && lobbies[player.lobbyCode]) {
            const lobby = lobbies[player.lobbyCode];
            lobby.players = lobby.players.filter(pid => pid !== userId);
            
            // If lobby is empty, delete it
            if (lobby.players.length === 0) {
                delete lobbies[player.lobbyCode];
                delete lobbyFaceData[player.lobbyCode];
                console.log(`Deleted empty lobby ${player.lobbyCode}`);
            } else {
                // If the host left, assign new host
                if (lobby.host === userId && lobby.players.length > 0) {
                    lobby.host = lobby.players[0];
                    players[lobby.players[0]].isHost = true;
                    console.log(`Assigned new host ${lobby.players[0]} to lobby ${player.lobbyCode}`);
                }
                
                // Broadcast updated member list
                broadcastToLobby(player.lobbyCode, "lobby_members", {
                    code: player.lobbyCode,
                    members: lobby.players.map(uid => ({
                        userId: uid,
                        username: players[uid]?.username || null,
                        isHost: lobby.host === uid,
                        isReady: players[uid]?.ready || false,
                        class: players[uid]?.class || "pistol"
                    }))
                });
            }
        }
        delete players[userId];
        updateLobbyStatus();
    });

    ws.on('error', (err) => {
        console.error(`WebSocket error for ${userId}:`, err);
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// // Join as player
// { "type": "join", "role": "player", "username": "AceShooter" }

// // Join as spectator
// { "type": "join", "role": "spectator" }

// // Ready up
// { "type": "ready" }

// // Send score update
// { "type": "score", "score": 3 }

// Remove users with null/empty usernames from a lobby and from players
function removeNullUsersFromLobby(lobbyCode) {
    if (!lobbies[lobbyCode]) return;
    // Remove from lobby's player list
    lobbies[lobbyCode].players = lobbies[lobbyCode].players.filter(uid => {
        const p = players[uid];
        return p && p.username && p.username.trim();
    });
    // Remove from players object
    Object.keys(players).forEach(uid => {
        if (players[uid].lobbyCode === lobbyCode && (!players[uid].username || !players[uid].username.trim())) {
            delete players[uid];
        }
    });
}

// Delete a lobby
function deleteLobby(code) {
    if (lobbies[code]) {
        delete lobbies[code];
        // Clean up face data for this lobby
        delete lobbyFaceData[code];
        console.log(`Deleted lobby ${code} and cleaned up face data`);
    }
}