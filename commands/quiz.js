const Discord = module.require("discord.js");
const puppeteer = require('puppeteer');
const canvaspkg = require('canvas');
const imageSize = require('image-size');
const fs = require('fs');
const path = require('path');

module.exports.users = [];

//credit to potato man: https://gist.github.com/FirstPotatoMan/9d02d14f468870ffe93ca6e256617c68
const joiner = async(inDir, outFile, bufferBetween=10)=> {

    //get all file paths
    const imagePaths = fs.readdirSync(inDir)

    //get all dimesions of the images
    const imageDims = imagePaths.map(path=>imageSize(`./quizimages/${path}`))
    
    //split the images into X and Y (widht, and length)
    const XLens = imageDims.map(data=>data.width)
    const YLens = imageDims.map(data=>data.height)
    
    //get size for canvas (we take the max width, to account for the biggest image), and the sum of all the heights plus a buffer for a 
    //nice transition between images
    const canvasX = Math.max(...XLens)+(bufferBetween*2);
    const canvasY = YLens.reduce((a,b)=>a+b) + (bufferBetween*2) * imagePaths.length
    
    //create canvas
    const canvas = canvaspkg.createCanvas(canvasX, canvasY);
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, canvasX, canvasY);
    
    //for each image, load it, and put it at the appropriate coordinates
    let runningY = bufferBetween;
    for (let i in imagePaths){
        const image = await canvaspkg.loadImage(`./quizimages/${imagePaths[i]}`)
        ctx.drawImage(image, bufferBetween, runningY)
        runningY+=YLens[i] + bufferBetween
    }
    //convert image to buffer and store it on path
    const buffer = canvas.toBuffer()
    fs.writeFileSync(outFile, buffer)
}

module.exports.run = async (bot, message, args) => {
    try {
          if (message.channel instanceof Discord.DMChannel) {
            const exampleEmbed2 = new Discord.RichEmbed()
              .setColor('#ff0000')
              .setTitle(`This command is not allowed in DMs`);
            return await message.channel.send(exampleEmbed2);
          }
          
          let TreeNode = function(left, right, operator) {
              this.left = left;
              this.right = right;
              this.operator = operator;

              this.toString = function() {
                  return '(' + left + ' ' + operator + ' ' + right + ')';
              }
          }

          function randomNumberRange(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
          }

          let ops = ['/','*','-','+'];

          function buildTree(numNodes) {
              if (numNodes === 1)
                  return randomNumberRange(1, 100);

              let numLeft = Math.floor(numNodes / 2);
              let leftSubTree = buildTree(numLeft);
              let numRight = Math.ceil(numNodes / 2);
              let rightSubTree = buildTree(numRight);

              let m = randomNumberRange(0, ops.length);
              let op = ops[m];
              return new TreeNode(leftSubTree, rightSubTree, op);
          }
          if (module.exports.users.includes((message.author.id.toString())+':'+(message.channel.id.toString()))) {
            const exampleEmbed2 = new Discord.RichEmbed()
              .setColor('#ff0000')
              .setTitle(`A quiz is in progress already.`);
            return await message.channel.send(exampleEmbed2);
          }
      
          if (args.length !== 1 || args[0] > 60 || isNaN(parseInt(args[0]))) {
            const exampleEmbed2 = new Discord.RichEmbed()
              .setColor('#ff0000')
              .setTitle(`Invalid command structure.`);
            return await message.channel.send(exampleEmbed2);
          }
          //let equation = buildTree(difficulty).toString();
          let m = await message.reply("Please wait...");
          module.exports.users.push((message.author.id.toString())+':'+(message.channel.id.toString()));
          const browser = await puppeteer.launch({args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
          ]});
        
          const page = await browser.newPage();
        
          let years = [2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002]
          let ab = ['A', 'B']
          let year = years[Math.floor(Math.random() * years.length)];
          let letter = ab[Math.floor(Math.random() * 2)];
          let problem = randomNumberRange(1, 25);
          let randomlink = `https://artofproblemsolving.com/wiki/index.php/${year}_AMC_10${letter}_Problems/Problem_${problem}`;
          await page.goto(randomlink, {
                    timeout: 60000
          })
        
          await page.waitForSelector('#mw-content-text');
          const search = await page.$eval('#mw-content-text', (thing) => { 
              
              const child = thing.firstChild;
              const cData = child.childNodes;
              const nodeArr = [];
              
              cData.forEach((c) => {
                  if (c.nodeName !== '#text'){
                      nodeArr.push(c);            
                  }
              });
              
              const nodeT = nodeArr.map((n) => n.nodeName);
              const start = nodeT.indexOf('H2');
              const endOfProb = nodeT.indexOf('H2',  start+1);
              const problem = nodeT.slice(nodeT.indexOf('H2')+1, endOfProb);
              const problemNodes = [];
              problem.forEach((x) => {
                  problemNodes.push(`${x}|${nodeT.indexOf(x, start+1)+1}`);
                  nodeT.splice(nodeT.indexOf(x, start+1), 1, "gay");
              });
              return problemNodes;
          });
          

          fs.readdir('./quizimages', (err, files) => {
            if (err) throw err;

            for (const file of files) {
              fs.unlink(path.join('./quizimages', file), err => {
                if (err) throw err;
              });
            }
          });
      
          for (let i of search) {
              const type = i.split('|')[0];
              const idx = i.split('|')[1];
              const problemPart = (await page.$(`#mw-content-text > div > ${type}:nth-child(${idx})`));
              await problemPart.screenshot({path: `./quizimages/${idx}.png`}); 
          }
      
          await joiner('./quizimages/', './quizimages/g.png')
          
          m.delete(500);
           const exampleEmbed2 = new Discord.RichEmbed()
              .setColor("#A3A6E8")
              .setTitle(`You have ${args[0]} min. to do this problem`)
              .attachFiles([`./quizimages/g.png`])
              .setImage(`attachment://g.png`);
            let answerslink = `https://artofproblemsolving.com/wiki/index.php/${year}_AMC_10${letter}_Answer_Key`
            await page.goto(answerslink, {
                      timeout: 60000
            })

            await page.waitForSelector(`#mw-content-text`);      
            const element = await page.$(`#mw-content-text>div>ol>li:nth-child(${problem})`);
            let answer = await (await element.getProperty('textContent')).jsonValue();

            let msg = await message.channel.send(exampleEmbed2);

            switch (answer) {
                case 'A':
                    answer = '🇦';
                    break;
                case 'B':
                    answer = '🇧';
                    break;
                case 'C':
                    answer = '🇨';
                    break;
                case 'D':
                    answer = '🇩';
                    break;
                case 'E':
                    answer = '🇪';
                    break;
            }


            const filter = (reaction, user) => {
                  return ['🇦', 
                          '🇧',
                          '🇨',
                          '🇩',
                          '🇪'].includes(reaction.emoji.name) && user.id == message.author.id;
            };

            await msg.react('🇦');
            await msg.react('🇧');
            await msg.react('🇨');
            await msg.react('🇩');
            await msg.react('🇪');

            msg.awaitReactions(filter, { max: 1, time: 60000*args[0], errors: ['time'] })
              .then(collected => {
                  const reaction = collected.first();
                  if (reaction.emoji.name === answer) {
                      const exampleEmbed2 = new Discord.RichEmbed()
                        .setColor('#A3A6E8')
                        .setTitle("Correct!")
                        .setDescription(`You can find the problem here: ${randomlink}`)
                      message.channel.send(exampleEmbed2);
                      module.exports.users.splice(module.exports.users.indexOf(message.author.id), 1);
                  } else {
                      const exampleEmbed2 = new Discord.RichEmbed()
                            .setColor('#ff0000')
                            .setTitle(`The correct answer was ${answer}`)
                            .setDescription(`You can find the problem here: ${randomlink}`)
                      message.channel.send(exampleEmbed2);
                      module.exports.users.splice(module.exports.users.indexOf(message.author.id), 1);
                  }
              })
              .catch(collected => {
                    module.exports.users.splice(module.exports.users.indexOf(message.author.id), 1);
                    const exampleEmbed2 = new Discord.RichEmbed()
                            .setColor('#ff0000')
                            .setTitle(`The correct answer was ${answer}`)
                            .setDescription(`You can find the problem here: ${randomlink}`)
                    message.channel.send(exampleEmbed2);
              });

          await browser.close();
    } catch(e) { 
        const exampleEmbed2 = new Discord.RichEmbed()
              .setColor('#ff0000')
              .setTitle(`There was an error, please try again.`)
        module.exports.users.splice(module.exports.users.indexOf(message.author.id), 1);
        message.channel.send(exampleEmbed2); 
        console.log(e.stack);
    }
}

module.exports.help = {

    name: "quiz",
    desc: "ggf",
    personalThoughts: "anhh"

}
