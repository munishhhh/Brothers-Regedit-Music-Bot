const https = require('https');
const fs = require('fs');

const cr = Buffer.from('QgtjTb2FFweMPMVdbz3Ab4SwkxI2:fiO0Tp0FWX').toString('base64');
const data = JSON.stringify({
    type: "upload",
    fileName: "test.wav",
    fileUrl: "https://ttsreader.com/player/audio/Christopher.mp3"
});

const req = https.request('https://api.speechnotes.co/Api_20250209_7get', {
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + cr,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let output = '';
    res.on('data', chunk => output += chunk);
    res.on('end', () => console.log('Response:', output));
});
req.on('error', console.error);
req.write(data);
req.end();
