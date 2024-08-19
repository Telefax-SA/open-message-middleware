const WebSocket = require('ws').Client;

// URL del endpoint al que te quieres conectar
const ws = new WebSocket('wss://localhost:8080');

// // Cuando se establece la conexión
// ws.on('open', function open() {
//     console.log('Connected to the WebSocket server');
    
//     // Enviar un mensaje de prueba
//     ws.send(JSON.stringify({ message: 'Hello from Node.js WebSocket client!' }));
// });

// // Manejar mensajes recibidos del servidor
// ws.on('message', function incoming(data) {
//     console.log('Received message:', data);
// });

// // Manejar errores
// ws.on('error', function error(err) {
//     console.error('WebSocket error:', err);
// });

// // Manejar cierre de la conexión
// ws.on('close', function close() {
//     console.log('WebSocket connection closed');
// });
