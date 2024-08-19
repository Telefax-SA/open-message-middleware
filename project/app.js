/********************************************
 * An example Express NodeJS app that 
 * implements Genesys Cloud Open Messaging
 */
const express = require("express");
const crypto = require('crypto');
const https = require('https');
const localtunnel = require('localtunnel');
const {v4: uuidv4} = require('uuid');
const config = require('./config.js');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws').Server;
// Gotta have the Genesys Cloud Platform API
const platformClient = require('purecloud-platform-client-v2');
const wss = new WebSocket({ port: 8080 });

const client = platformClient.ApiClient.instance;

let accessToken = null;

const messageDeploymentId = '21732265-c47a-4c76-a877-d5f033129382';

// Initialize express and define a port
const app = express();
const PORT = 443;


const privateKey = fs.readFileSync('/etc/letsencrypt/live/tftesting.ddns.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/tftesting.ddns.net/fullchain.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/tftesting.ddns.net/chain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };


// Reserved domain name for Local Tunnel
const LT_SUBDOMAIN = 'test-telefax';

const ExtSessionId = uuidv4();

// Tell express to use body-parser's JSON parsing
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static('web'));

let transcript = [];
let tableId = new Map();

wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

wss.on('connection', function connection(ws) {
    let id = wss.getUniqueID();
    ws.id = id;
    //tableId.set(, id);
    ws.once('message', function addToTable(data){
        let emailID = data.toString().split("\n")[0] + " ";
        emailID = emailID.trim();
        tableId.set(emailID, id + "_" + emailID);
        console.warn(tableId.get(emailID));
    });

    ws.on('message', function message(data) {
        let emailID = data.toString().split("\n")[0] + " ";
        let dataSplitted = data.toString().split("\n");
        let message = "";
        for (let index = 1; index < dataSplitted.length; index++) {
            message += (dataSplitted[index])+" ";
        }
        console.log(message);
        body = {
            "nickname": "NahuelM",
            "id": emailID.trim(),
            "idType": "email",
            "firstName": "Nahuel",
            "lastName": "Marrero",
            "message": message
        }

        try {
            sendMessageToGenesys(body);
        } catch(e) {}

    });

});

/***************************************************
 * Authenticate with Genesys Cloud using an
 * OAuth Client Credentials Grant flow
 */

function authenticate() {
    client.setEnvironment(platformClient.PureCloudRegionHosts.sa_east_1);
    client.loginClientCredentialsGrant(config.clientId, config.clientSecret)
    .then((data)=> {
        accessToken = data.accessToken;

        // Start HTTPS server on the defined port
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(PORT, () => {
            console.log(`HTTPS Server running on port ${PORT}`);

            // Start Local Tunnel for public internet access
            (async () => {
                const tunnel = await localtunnel({ 
                    port: PORT, 
                    subdomain: LT_SUBDOMAIN
                });

                console.log(`Server listening on external URL ${tunnel.url}`);

                tunnel.on('close', () => {
                    console.log("tunnels are closed")
                    // tunnels are closed
                });
            })();
        });
    })
    .catch((err) => {
        // Handle failure response
        console.log(err, "Error to authenticate");
    });
}

function wrtieToLogFile(text) {
    const formattedLogEntry = `[${new Date().toISOString()}] ${text}\n`
    fs.appendFile("./app.log", formattedLogEntry, (err) => {
        if (err)
            console.error("Error writing to log file: ", err);
    });
}

/*****************************************************************
 * This route is used when Genesys sends a message to the end user
 */
app.post("/messageFromGenesys", (req, res) => {
    console.warn("received a message from Genesys");
    wrtieToLogFile("Headers: " + JSON.stringify(req.headers));
    wrtieToLogFile("Body: " + JSON.stringify(req.body));
    wrtieToLogFile("Path: " + JSON.stringify(req.path));

    if(req.body.channel.from.nickname === "Test Open message") {
        let to = req.body.channel.to.id;
        let id = tableId.get(to);
        if(id != undefined){
            id = id.split("_")[0];
        }
        wss.clients.forEach(function each(client) {
            if(client.id === id)
                client.send(req.body.text);
        });
        console.error("TO: "+to);
            transcript.push({
                sender: "Operador",
                message: req.body.text,
                purpose: "agent"
            });
    }
    res.status(200).end(); // Responding is important
});

/******************************************************************
 * This route is used for the end user to send a message to Genesys
 */
app.post("/messageToGenesys", (req, res) => {
    try {
        sendMessageToGenesys(req.body);
    } catch(e) {
        // TODO: do some error handling
    }
    res.status(200).end(); // Responding is important
});

/********************************************************************
 * Implement the code to send a message to Genesys Open Messaging API
 */
function sendMessageToGenesys(data) {
    if (data.message === '') {
        console.log("No message to send");
        return;
    }
    var d = new Date();

    const body = JSON.stringify({
        "id": ExtSessionId,
        "channel": {
          "platform": "Open",
          "type": "Private",
          "messageId": uuidv4(),
          "to": {
            "id": messageDeploymentId
          },
          "from": {
            "nickname": data.nickname,
            "id": data.id,
            "idType": data.idType,
            "firstName": data.firstName,
            "lastName": data.lastName
          },
          "time": d.toISOString()
        },
        "type": "Text",
        "text": data.message,
        "direction": "Inbound",
    });

    const options = {
        hostname: 'api.sae1.pure.cloud',
        port: 443,
        path: '/api/v2/conversations/messages/inbound/open',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': body.length,
            'Authorization': 'bearer ' + accessToken
        }
    };
  
    console.log("options: " + JSON.stringify(options));
    console.log("body: " + body);

    const apireq = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);
      
        res.on('data', d => {
            console.log("datachunk");
        });

        res.on('end', () => {
            console.log('on end');
            transcript.push({
                sender: data.nickname,
                message: data.message,
                purpose: "customer"
            });
        });
    });
  
    apireq.on('error', error => {
        console.error(error);
    });
  
    apireq.write(body);
    apireq.end();
}

/******************************************************************
 * This route is used by the sample UI to display the OM transcript
 */
app.get("/transcript", (req, res) => {
    res.write(JSON.stringify(transcript));
    res.status(200).end();
    //transcript = [];
});

authenticate();
