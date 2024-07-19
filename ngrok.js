const ngrok = require('ngrok');
const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

// Replace with your Duck DNS token and domain
const DUCK_DNS_TOKEN = '';
const DUCK_DNS_DOMAIN = '';

// Define the path to your log file
const logFilePath = path.join(__dirname, 'app.log');

// Create a logging function
function logMessage(message) {
    console.log(message); // Log to console
    fs.appendFile(logFilePath, message + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

// Clear the log file at the start
fs.writeFile(logFilePath, '', (err) => {
    if (err) {
        console.error('Error clearing log file:', err);
        return;
    }

    // Parse command-line arguments
    const args = minimist(process.argv.slice(2));
    const connectionType = args.type || 'tcp'; // Default to 'tcp' if not provided
    const port = args.port || 25565; // Default port if not provided

    // Proceed with the main script logic
    (async function() {
        try {
            // Start ngrok with TCP protocol
            const url = await ngrok.connect({
                proto: connectionType,
                addr: `127.0.0.1:${port}`,
                region: 'eu'
            });

            // Extract hostname and port from the URL
            const match = url.match(/tcp:\/\/(.+):(\d+)/);
            if (match) {
                const hostname = match[1];
                const port = match[2];

                // Resolve the hostname to an IP address
                const addresses = await dns.lookup(hostname);
                const ip = addresses.address;

                logMessage(`Ngrok Hostname: ${hostname}`);
                logMessage(`Resolved IP: ${ip}`);
                logMessage(`Ngrok Port: ${port}`);

                // Update Duck DNS with the new IP
                const duckDnsUrl = `https://www.duckdns.org/update?domains=${DUCK_DNS_DOMAIN}&token=${DUCK_DNS_TOKEN}&ip=${ip}`;
                const response = await axios.get(duckDnsUrl);

                if (response.data.includes('OK')) {
                    logMessage('Duck DNS update successful');
                    logMessage('Duck DNS IP: '+DUCK_DNS_DOMAIN+".duckdns.org:"+port)
                } else {
                    logMessage(`Duck DNS update failed: ${response.data}`);
                }
            } else {
                logMessage(`Ngrok URL: ${url}`);
                let cleanedUrl = url.replace(/^https?:\/\//, '');
                // Resolve the hostname to an IP address
                const addresses = await dns.lookup(cleanedUrl);
                const ip = addresses.address;

                logMessage(`Ngrok Hostname: ${cleanedUrl}`);
                logMessage(`Resolved IP: ${ip}`);

                // Update Duck DNS with the new IP
                const duckDnsUrl = `https://www.duckdns.org/update?domains=${DUCK_DNS_DOMAIN}&token=${DUCK_DNS_TOKEN}&ip=${ip}`;
                const response = await axios.get(duckDnsUrl);

                if (response.data.includes('OK')) {
                    logMessage('Duck DNS update successful');
                    logMessage('Duck DNS IP: '+DUCK_DNS_DOMAIN+".duckdns.org:")
                } else {
                    logMessage(`Duck DNS update failed: ${response.data}`);
                }
            }
        } catch (error) {
            logMessage(`Error: ${error}`);
        }
    })();
});
