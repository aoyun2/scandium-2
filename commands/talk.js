const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talk";

module.exports.run = async (bot,message,args) => {
   	// import { gpt } from "gpti";
	const { gpt } = require("gpti");
	
	gpt({
	    prompt: "hello gpt, tell me what your version is?",
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
