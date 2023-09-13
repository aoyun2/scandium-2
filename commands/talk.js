const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talk";

module.exports.run = async (bot,message,args) => {
   	// import { gpt } from "gpti";
	const { gpt } = require("gpti");
	
	gpt({
	    prompt: `aoyun: too late now?
Raindaggers: why was the hw so long bro
seal stack: bc it is
aoyun: @EpicLava
EpicLava: maybe i'll join for like 20 minutes
aoyun: bet
triangularnotes22: Do we even need to do the hw correctly
Raindaggers: no shot she's cehcking it unl;ess she got infinite time glitch
triangularnotes22: I wish we could just submit random photos
EpicLava: ms kopatic said every once in a while we will have an in-person homework check
aoyun: 💀 bro is going through wormholes to grade the stats hw
aoyun: ill join but im programming the bot rn
Raindaggers: jaeho
aoyun: How long is epiclava joining for?`,
	    model: "gpt-4",                         // code or model
	    type: "json"                            // optional: "json" or "markdown"
	}, (err, data) => {
	    if(err != null){
	        console.log(err);
	    } else {
	        console.log(data);
	    }
	});
}

module.exports.help = {

    name:"talk",
    desc: "head",
    personalThoughts: "pat"

}
