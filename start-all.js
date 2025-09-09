// This script starts the frontend, waits for it to be ready, then starts the backend
const { spawn } = require('child_process');
const waitOn = require('wait-on');

// Start frontend
const frontend = spawn('npm', ['run', 'start', '--prefix', 'frontend'], {
  stdio: 'inherit',
  shell: true
});

// Wait for frontend to be ready (Vite default: http://localhost:5173)
const frontendUrl = 'http://localhost:5173';
waitOn({ resources: [frontendUrl], timeout: 60000 })
  .then(() => {
    console.log('Frontend is up! Starting backend...');
    // Start backend
    const backend = spawn('npm', ['run', 'start', '--prefix', 'backend'], {
      stdio: 'inherit',
      shell: true
    });
    backend.on('close', code => {
      process.exit(code);
    });
  })
  .catch(err => {
    console.error('Frontend did not start in time:', err);
    frontend.kill();
    process.exit(1);
  });