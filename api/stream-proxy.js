// api/stream-proxy.js
// La función Serverless que Vercel ejecutará.

// Vercel soporta 'node-fetch', así que lo requerimos para compatibilidad.
const fetch = require('node-fetch');

// URL base del stream
const URL_BASE = 'https://dlhd.dad/stream/'; 

module.exports = async (req, res) => {
    // Manejar la petición de pre-vuelo (OPTIONS) que puede enviar el navegador (CORS)
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    // Solo permitir peticiones GET
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        return res.end('Method Not Allowed');
    }

    try {
        // 1. Obtener el ID del stream de la URL (ej: /api/stream-proxy?id=445)
        const url = new URL(req.url, `http://${req.headers.host}`);
        const streamId = url.searchParams.get('id');

        if (!streamId) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('Error: Missing stream ID parameter.');
        }

        // 2. Construir la URL completa del stream externo
        const targetUrl = `${URL_BASE}stream-${streamId}.php?disableads=1&no-reload=1&autoplay=1`;

        // 3. Petición de servidor a servidor (omite CORS y Referer)
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                // Simular un Referer para evitar Hotlink Protection si es necesario
                'Referer': URL_BASE, 
                'User-Agent': 'Vercel Serverless Proxy (Node.js)'
            },
        });

        // 4. Configurar cabeceras de respuesta (CORS obligatorio)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        
        // Evitar que el servidor externo fuerce la seguridad de incrustación
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');

        // 5. Reenviar el estado de la respuesta externa
        res.statusCode = response.status;
        
        // 6. Transmitir el cuerpo del stream directamente
        response.body.pipe(res);

    } catch (error) {
        // Si hay un fallo de red o un error en el código
        console.error('SERVERLESS CRASH:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Proxy Failed: ${error.message}`);
    }
};
