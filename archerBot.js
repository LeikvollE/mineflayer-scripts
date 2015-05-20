var mineflayer = require('../');
var vec3 = mineflayer.vec3;
var navigatePlugin = require('../node_modules/mineflayer-navigate-master')(mineflayer);

var bot = mineflayer.createBot({
    username: process.argv[4] ? process.argv[4] : "Archer",
    verbose: true,
    port: parseInt(process.argv[3]),
    host: process.argv[2],
    password: process.argv[5]
});

navigatePlugin(bot);

bot.navigate.blocksToAvoid[132] = true; // tripwire
bot.navigate.blocksToAvoid[59] = false; // crops

var targetUsername = null;

var targetVelocity = vec3(0, 0, 0);

var MESSAGE_DELAY = 1000 * 60 * 5;
var MIN_SHOOT_TIME = 1000 * 2;
var MAX_SHOOT_TIME = 1000 * 4;
var COMFORTABLE_FIRING_RADIUS = 20;

var shooting = false;
var shoot = null;

bot.once('spawn', function () {
    checkState();
    var announce = setInterval(checkState, MESSAGE_DELAY);
    setTimeout(shootArrow, MIN_SHOOT_TIME);
});

bot.on('chat', function (username, message) {
    if((message == 'Challenge') || (message == 'challenge')){
        if (hasItems()) {
            challenge(username);
        } else {
            checkState();
        }
    }
});

bot.navigate.on('cannotFind', function (closestPath) {
    /*bot.navigate.walk(closestPath, function (stopReasons) {
        bot.chat('walked half path!');
        shootArrow();
    });*/

});

bot.navigate.on('arrived', function () {
    /*bot.chat('arrived');
    shootArrow();*/
});

bot.on('death', function () {
    endChallenge();
});

bot.on('entityGone', function (entity) {
    if (entity.username === targetUsername) {
        bot.chat("I have defeated " + targetUsername + ".");
        endChallenge();
    }
});

function shootArrow() {
    if (shooting) return scheduleNext();
    if (!targetUsername) {
        return scheduleNext();
    }
    if (!selectBow()) return scheduleNext();
    var entity = bot.players[targetUsername].entity;
    if (! entity) return scheduleNext();
    bot.navigate.stop();
    shooting = true;
    bot.activateItem();
    var lookInterval = setInterval(look, 20);
    setTimeout(release, 1500);

    function look() {
        var distance = bot.entity.position.distanceTo(entity.position);
        var heightAdjust = entity.height * 0.8 + (distance * 0.05);
        bot.lookAt(entity.position.offset(0, heightAdjust, 0).plus(targetVelocity.scaled(650)));
    }

    function release() {
        shooting = false;
        clearInterval(lookInterval);
        look();
        bot.deactivateItem();
        scheduleNext();
        moveRandom();
    }

    function scheduleNext() {
        setTimeout(shootArrow, Math.random() * (MAX_SHOOT_TIME - MIN_SHOOT_TIME) + MIN_SHOOT_TIME);
    }

}

function moveRandom() {
    if (shooting) return;
    if (!targetUsername) return;
    var entity = bot.players[targetUsername].entity;
    if (!entity) return;

    var angle = Math.random() * 2 * Math.PI;
    var dx = COMFORTABLE_FIRING_RADIUS * Math.cos(angle);
    var dz = COMFORTABLE_FIRING_RADIUS * Math.sin(angle);
    var dest = vec3(entity.position.x + dx, 255, entity.position.z + dz);
    // move dest down until we hit solid land
    for (; dest.y >= 0; dest.y -= 1) {
        var block = bot.blockAt(dest);
        if (block && block.boundingBox !== 'empty') break;
    }
    bot.navigate.to(dest, {
        endRadius: 10,
        timeout: 1000,
    });
}

function endChallenge() {
    bot.chat('I have been defeated by ' + targetUsername);
    targetUsername = null;
    setTimeout(checkState, 1000);
}

function challenge(target) {
    if (targetUsername) {
        bot.tell(target, 'I am currently in a challenge with ' + target);
        return;
    } else if (!bot.players[target].entity) {
        bot.tell(target, 'You are too far away from me, i am at ' + bot.entity.position.floored());
        return;
    }
    targetUsername = target;
    moveRandom();
    checkState();
}

function checkState() {
    if (targetUsername) {
        bot.chat('I am currently in a duel with ' + targetUsername + '.')
    } else if (hasItems()) {
        bot.chat('If you dare challenge me, please say "Challenge".')
    } else {
        bot.chat('I can only accept challenges if i have a bow and at least 30 arrows.');
    }
}

function hasItems() {
    var bow = bot.inventory.findInventoryItem(261);
    if (bow) {
        bot.equip(bow, 'hand');
    }
    var arrows = bot.inventory.count(262);
    return bow != null && arrows >= 30;
}

function selectBow() {
    var bow = bot.inventory.findInventoryItem(261);
    if (bow) {
        bot.equip(bow, 'hand');
    }
    return bow;
}
