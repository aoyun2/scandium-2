const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talk";

module.exports.run = async (bot,message,args) => {  
    var postData = JSON.stringify({
      "model": "gpt-3.5-turbo",
      "max_tokens": 100,
      "messages": [
          {
              "role": "system",
              "content": "You are an helpful assistant."
          },
          {
              "role": "user",
              "content": "Who are you?"
          }
      ]
    });
    
    const options = {
		    host: 'api.pawan.krd',
		    path: '/v1/chat/completions',
        headers: {
          "Content-Type": 'application/json',
          Authorization: 'Bearer pk-RntcqFvvxYKasPLoSbAkgogyfwMXKgmNDLxcPdrzEVcwtWCJ'
        }
		};
    
    var req = https.request(options, (res) => {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);
    
      res.on('data', (d) => {
        console.log(d);
        //await message.channel.send(`Invalid person.`);
      });
    });
    
    req.on('error', (e) => {
      console.error(e);
    });
    
    req.write(postData);
    req.end();
}

module.exports.help = {

    name:"talk",
    desc: "head",
    personalThoughts: "pat"

}
