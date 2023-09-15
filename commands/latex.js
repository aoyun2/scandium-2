const Discord = module.require("discord.js")
const puppeteer = require('puppeteer');

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports.name = "latex";

module.exports.run = async (bot, message, args) => {
    if (message.channel instanceof Discord.DMChannel) {
        const exampleEmbed2 = new Discord.MessageEmbed()
          .setColor('#ff0000')
          .setTitle(`This command is not allowed in DMs`);
        return await message.channel.send(exampleEmbed2);
    }
  
    if (!args || args.length > 2 || args.length < 1) {
      const exampleEmbed2 = new Discord.MessageEmbed()
              .setColor('#ff0000')
              .setTitle(`Invalid command structure.`);
      return await message.channel.send(exampleEmbed2); 
    }
  
    let msg = await message.reply("Please wait...")
    
    try {
      
        const browser = await puppeteer.launch({
          args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
        ]});
      
        const filter = (reaction, user) => {
            return reaction.emoji.name === '🔴' && user.id == message.author.id;
        };

        msg.react('🔴');
        
        msg.awaitReactions(filter, { max: 1, time: 60000*args[0], errors: ['time'] }).then(async () => {
            await msg.delete(10);
            await browser.close();
        }).catch();
        
        const page = await browser.newPage();
      
        let code = args[0];
        if (args[1]) {
          if (args[1].replace(' ', '') === "true") {
             await page.goto(args[0].replace(' ', ''), {
                    timeout: 10000
             });
    
             const codeArea = await page.$("body > div.wrap > div.container > div.content > div > textarea");
             code = await (await codeArea.getProperty('textContent')).jsonValue(); 
          }
        }

        await page.goto('https://quicklatex.com/',  
            {timeout: 10000},
            { waitUntil: "networkidle0" }
        );
        
        const preamble = code.includes('{pre}')?code.slice(code.indexOf("{pre}")+10, code.indexOf("{\\pre}")):'';
        const body = (preamble === '')?code:code.slice(code.indexOf("{\\pre}")+11);
        //console.log(preamble);
        //console.log(body);
      
        await page.evaluate((text) => {
            document.querySelector('#qltext').value = text;
        }, body);
      
        if (preamble!==null) {
            await page.evaluate( function(text) {
                document.querySelector('#pretext').value = text;
            }, preamble);
        }

        //await page.click('#adv_wrap > #advanced');
        //await page.click('#showerrors');
        //await sleep(1000);
        
        //await page.waitForSelector('#math > p:nth-child(2) > img', {timeout: 30000});
        //const type = await page.$eval('#math', (output) => {
        //    const outputParts = output.childNodes;
        //    return outputParts[1].nodeName.toLowerCase();
        //});
        //console.log(type);
        await page.click('#compile');
        await page.waitForSelector(`#math > p:nth-child(2) > img`, {timeout:30000});
        await sleep(1000);
        const latex = await page.$(`#math > p:nth-child(2) > img`);
        await latex.screenshot({path: `f.png`}); 
        
        const exampleEmbed2 = new Discord.MessageEmbed()
                //.setTitle(`${message.author.username}:`)
                .setColor('#A3A6E8')
                .attachFiles([`f.png`])
                .setImage(`attachment://f.png`);
      
        await message.channel.send(exampleEmbed2);
      
        await msg.delete();
        //await message.delete(10);
      
    } catch(e) {
        const exampleEmbed2 = new Discord.MessageEmbed()
              .setColor('#ff0000')
              .setTitle(`Aborted.`);
        msg.delete(10);
        message.channel.send(exampleEmbed2); 
        console.log(e.stack);
    }
}

module.exports.help = {
    name: "latex",
    desc: "df",
    personalThoughts: "asdf"
}
