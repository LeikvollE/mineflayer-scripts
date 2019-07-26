var mineflayer = require('mineflayer');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var vec3 = mineflayer.vec3;

if(process.argv.length<4 || process.argv.length>6)
{
    console.log("Usage : node pkFisher.js <host> <port> [<name>] [<password>]");
    process.exit(1);
}

var bot = mineflayer.createBot({
    username: process.argv[4] ? process.argv[4] : "fisher",
    verbose: true,
    port:parseInt(process.argv[3]),
    host:process.argv[2],
    password:process.argv[5]
});

navigatePlugin(bot);

var posChest = null;
var posFish = null;
var posFishX = null;
var posFishY = null;
var posFishZ = null;
var blockChest = null;

var status = 'init';

bot.on('chat', function (username, message) {
    if (username == bot.username) return;
    if (message == 'chest') {
        posChest = bot.players[username].entity.position;
        blockChest = findBlock('chest', 4, posChest);
        bot.chat('Okay, i will store all the fish in the chest at ' + posChest);
    } else if (message == 'fish') {
        posFish = bot.players[username].entity.position;
        posFishX = bot.players[username].entity.position.x;
        posFishY = bot.players[username].entity.position.y;
        posFishZ = bot.players[username].entity.position.z;
        fish();
    }
    
    if (message == 'come') {
        status == 'come';
        bot.navigate.to(bot.players[username].entity.position);
    }
});

bot.navigate.on('arrived', function () {
    if (status == 'fish') {
        fishing();
    } else if (status == 'storing') {
        placeInChest();
    }
    
    if (status == 'come') {
        bot.chat("Here !");
        come = null;
    }
});

bot.on('soundEffectHeard', function (soundName, position, volume, pitch) {
    if (soundName == 'entity.bobber.splash') {
        if (status == 'fishing') {
			// add timeout... Without we have bugs
			setTimeout(bot.activateItem, 500);
            
            setTimeout(storeInChest, 1000);
        }
    }
});

function fish() {
    status = 'fish';
    var temp = vec3(posFishX, posFishY, posFishZ);
    //bot.chat(temp + "");
    //bot.chat(posFish + "");
    bot.navigate.to(temp);
}

function fishing(){
    status = 'fishing';
    selectRod();
    bot.activateItem();
}

function selectRod() {
    var rod = bot.inventory.findInventoryItem(346);
    var rod_count = bot.inventory.count(346);
    if (rod) {
        bot.equip(rod, 'hand');
        console.log(rod_count + " fishing rods, " + rod.metadata + " damage taken from current rod");
    } else {
        console.log('You do not have a fishing rod!');
    }
    return rod;
}

function storeInChest() {
    status = 'storing';
    var tempVar = vec3(blockChest.position.x, blockChest.position.y + 1, blockChest.position.z);
    //bot.chat(status + " " + tempVar);
    bot.navigate.to(tempVar);
}

function placeInChest() {
    var chest = bot.openChest(blockChest);
    var fishI = bot.inventory.findInventoryItem(349);
    chest.on('open', function () {
        if (fishI) {
            chest.deposit(fishI.type, null, bot.inventory.count(fishI.type));
        }
        setTimeout(chest.close, 500);
        setTimeout(fish, 500);
    })
}

function findBlock(type, size, point) {
    var block = null;
    var shortest = null;
    var x1 = Math.floor(point.x - size);
    var x2 = Math.floor(point.x + size);
    var y1 = Math.floor(point.y - size);
    var y2 = Math.floor(point.y + size);
    var z1 = Math.floor(point.z - size);
    var z2 = Math.floor(point.z + size);
    //bot.chat(x1 + "");

    for (x = x1; x < x2; x++) {
        for (y = y1; y < y2; y++) {
            for (z = z1; z < z2; z++) {

                var cPoint = vec3(x, y, z);
                var cBlock = bot.blockAt(cPoint);
                //bot.chat(cPoint + "");
                if (cBlock) {
                    //bot.chat(cBlock.name);
                    if (cBlock.name == type) {
                        if ((shortest > cPoint.distanceTo(point)) || shortest == null) {
                            shortest = cPoint.distanceTo(point);
                            block = cBlock;
                        }
                    }
                }
            }
        }
    }

    return block;
}
