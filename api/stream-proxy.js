// api/stream-proxy.js
const fetch = require('node-fetch');

const URL_BASE = 'https://dlhd.dad/stream/'; 

module.exports = async (req, res) => {
    // Manejo de pre-vuelo OPTIONS
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        return res.end('Method Not Allowed');
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const streamId = url.searchParams.get('id');

        if (!streamId) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('Error: Missing stream ID parameter.');
        }

        const targetUrl = `${URL_BASE}stream-${streamId}.php?disableads=1&no-reload=1&autoplay=1`;

        // Petición al servidor de streams
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                // Simular el Referer para engañar la protección Hotlink
                'Referer': 'https://dlhd.dad/', 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Vercel Proxy/1.0',
            },
        });

        // 1. Configurar Cabeceras de Vercel
        // Reenviar status code
        res.statusCode = response.status;
        
        // Configurar CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        // 2. Filtrar Cabeceras de Seguridad del Servidor Externo
        const headers = Object.fromEntries(response.headers.entries());
        
        // Eliminar cabeceras que prohíben la incrustación (iFrame)
        delete headers['x-frame-options'];
        delete headers['content-security-policy'];
        
        // Forzar el Content-Type para evitar problemas
        headers['content-type'] = 'text/html'; // Forzamos que lo trate como HTML

        // Aplicar todas las cabeceras filtradas
        for (const [key, value] of Object.entries(headers)) {
            res.setHeader(key, value);
        }
        
        // 3. Transmitir el cuerpo del stream
        response.body.pipe(res);

    } catch (error) {
        console.error('SERVERLESS ERROR:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Proxy Failed: ${error.message}`);
    }
};
