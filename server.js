const botModule = require("./bot.js");
const express = require("express");
const bodyParser = require('body-parser');
const fs = require("fs");
const redis = require("redis");

const app = express();
const serverhttp = require('http').createServer(app).listen(process.env.PORT || 3001, () => {
    console.log(`server is listening on port ${process.env.PORT || 3001}`);
})

const io = require('socket.io')(serverhttp);
const { v4: uuidv4 } = require('uuid');
const { Channel, User } = require("discord.js");
const { Client } = require("./node_modules/socket.io/dist/client.js");

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get("/", (request, response) => {
    response.render('home');
    // console.log("pinged :)");
});

app.post('/connect', async (request, response) => {
    // console.log(request.body);
    const server = request.body.server;
    const userID = request.body.userID;
    const pass = request.body.password;

    getUser = async (ID, password) => {
        // const rawdata = fs.readFileSync('users.json');
        // const usersObj = JSON.parse(rawdata);
        // const userPass = Object.values(usersObj).find(v => v === password);
        // const uID = Object.keys(usersObj).find(k => k === ID);

        // if (userPass === undefined || uID === undefined) return false;
        // else return true;
        const client = redis.createClient(process.env.REDIS_URL || "redis://:p4ddbbfa3213866833993a412cecf086db781eac1558af21fd0ef5f3d8ee2f335@ec2-184-72-229-210.compute-1.amazonaws.com:19029");
        const util = require("util");
        var getAsync = util.promisify(client.get).bind(client);
                
        var data = await getAsync(ID);

        client.quit();

        if(data && data === password) return true;
        else return false;
    }

    if (await getUser(userID, pass) && server) {
        response.render('connected', {
            welcome: `Welcome, ${botModule.userName(userID)}!`,
            server: server,
            userID: userID,
            channels: botModule.fetchChannels(server, userID),
            emojis: JSON.stringify(botModule.fetchEmojis(userID)),
            users: JSON.stringify(botModule.fetchUsers(server)),
            roles: JSON.stringify(botModule.fetchRoles(server))
        });
    }
    else {
        // send error page.
        response.send("Verification failed. Please check your credentials.")
    }
});

var clients = {};

io.on('connection', (socket) => {
    const clientID = uuidv4();

    socket.once('join', (data) => {
        // console.log("client connected!")

        // add permission data for the user
        clients[clientID] = {
            websocket: socket,
            info: { // update with id, otherwise scan brok
                userID: data.userID,
                server: data.serverID,
                channel: {
                    id: data.channelID,
                    permissions: botModule.fetchPermissions(data.serverID, data.channelID, data.userID)
                }
            }
        };

        console.log(clients[clientID].info.userID, clients[clientID].info.server, clients[clientID].info.channel.id, clients[clientID].info.channel.permissions);

        socket.emit("connection_success");
    });

    socket.on('disconnect', () => {
        //console.log("client disconnected!")

        if(clients[clientID]) delete clients[clientID];
        console.log("disconnection", clients);
    });

    socket.on("request_channel_data", data => {
        // console.log(data)

        // keep in mind: READ_MESSAGE_HISTORY

        if (clients[clientID].info.channel.id !== data.channel) {
            clients[clientID].info.channel = {
                id: data.channelID,
                permissions: botModule.fetchPermissions(clients[clientID].info.server, data.channelID, clients[clientID].info.userID)
            }
        }

        if (!clients[clientID].info.channel.permissions.includes("READ_MESSAGE_HISTORY")) {
            // error
            // console.log(clients[clientID].info.channel.permissions, "can't read")
            socket.emit("error", "Could not load messages. You may not have the permission READ_MESSAGE_HISTORY in this channel.");
            return;
        }

        var client = clients[clientID];
        var s = client.info.server;
        var c = client.info.channel.id;

        botModule.fetchMessages(s, c, data.before).then(dat => {
            socket.emit("channel_history", dat);
        });
    });

    socket.on('fetch_mention_data', data => {
        // console.log(data);

        switch (data.type) {
            case 'user':
                socket.emit("mention_data", { id: data.id, data: botModule.userName(data.id) });
                break;
            case 'channel':
                socket.emit("mention_data", { id: data.id, data: botModule.channelName(data.id) });
                break;
            case 'role':
                socket.emit("mention_data", { id: data.id, data: botModule.roleName(clients[clientID].info.server, data.id) });
                break;
        }
    });

    socket.on('fetch_reply_JSON', async data => {
        socket.emit('reply_JSON',
            {
                JSON: await botModule.fetchMessage(clients[clientID].info.server, clients[clientID].info.channel.id, data.id),
                messageID: data.messageID
            });
    });

    socket.on('client_message', async data => {
        if (!clients[clientID].info.channel.permissions.includes("SEND_MESSAGES")) {
            // error
            socket.emit("error", "Error sending message. You may not have the permission SEND_MESSAGES in this channel.");
            return;
        }

        var s = clients[clientID].info.server;
        var c = clients[clientID].info.channel.id;
        var u = clients[clientID].info.userID;

        await botModule.sendMessage(s, c, u, data);
    });

    socket.on('reply_message', async data => {
        if (!clients[clientID].info.channel.permissions.includes("SEND_MESSAGES")) {
            // error
            socket.emit("error", "Error sending message. You may not have the permission SEND_MESSAGES in this channel.");
            return;
        }

        var s = clients[clientID].info.server;
        var c = clients[clientID].info.channel.id;
        var u = clients[clientID].info.userID;

        await botModule.replyToMessage(s, c, data.messageID, u, data.data);
        socket.emit("reply_success", data.messageID);
    });

    socket.on('delete_message', async data => {
        if (!clients[clientID].info.channel.permissions.includes("MANAGE_MESSAGES")) {
            // error
            socket.emit("error", "Could not delete message. You may not have the permission MANAGE_MESSAGES in this channel.");
            return;
        }

        var s = clients[clientID].info.server;
        var c = clients[clientID].info.channel.id;

        await botModule.deleteMessage(s, c, data);
    });

    // home.pug

    socket.on("populate_server_dropdown", userID => {
        socket.emit("servers", botModule.fetchGuilds(userID));
    });
});

module.exports.error = (message) => {
    // emit error to client
}

module.exports.broadcastMessage = (message, data) => {
    Object.keys(clients).forEach(c => {
        if (clients[c].info.server === data.server && clients[c].info.channel.id === data.channel) {
            clients[c].websocket.emit("new_message", message);
        }
    });
}

module.exports.broadcastMessageEdit = (message, data, id) => {
    Object.keys(clients).forEach(c => {
        if (clients[c].info.server === data.server && clients[c].info.channel.id === data.channel) {
            clients[c].websocket.emit("message_edit", { message: message, id: id });
        }
    });
}

module.exports.broadcastMessageDelete = (id, data) => {
    Object.keys(clients).forEach(c => {
        if (clients[c].info.server === data.server && clients[c].info.channel.id === data.channel) {
            clients[c].websocket.emit("message_delete", id);
        }
    });
}
