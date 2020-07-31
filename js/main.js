var game = new Phaser.Game(800, 600, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update
});

var assets = [
    'bell',
    'cherry',
    'clover',
    'crown',
    'diamond',
    'horseshoe',
    'seven',
    'star',
    'strawberry',
    'wattermelon'
];

var joker = 'diamond';

var paylines = [
    [ 1, 1, 1, 1, 1 ],
    [ 0, 0, 0, 0, 0 ],
    [ 2, 2, 2, 2, 2 ],
    [ 0, 1, 2, 1, 0 ],
    [ 2, 1, 0, 1, 2 ],
    [ 0, 0, 1, 0, 0 ],
    [ 2, 2, 1, 2, 2 ],
    [ 1, 0, 0, 0, 1 ],
    [ 1, 2, 2, 2, 1 ],
    [ 1, 0, 1, 0, 1 ],
    [ 1, 2, 1, 2, 1 ],
    [ 0, 1, 0, 1, 0 ],
    [ 2, 1, 2, 1, 2 ],
    [ 1, 1, 0, 1, 1 ],
    [ 1, 1, 2, 1, 1 ],
    [ 0, 1, 1, 1, 0 ],
    [ 2, 1, 1, 1, 2 ],
    [ 0, 1, 2, 2, 2 ],
    [ 2, 1, 0, 0, 0 ],
    [ 0, 2, 0, 2, 0 ],
    [ 2, 0, 2, 0, 2 ],
    [ 1, 0, 2, 0, 1 ],
    [ 1, 2, 0, 2, 1 ],
    [ 0, 0, 1, 2, 2 ],
    [ 2, 2, 1, 0, 0 ]
];

var reels;
var graphics;
var creditsText;
var scoreText;
var betText;
var reelStop;
var music;
var winning;

var credits = 1000;
var spinning = false;
var reels_position = 25;
var bet_multiply = 1;

// Symbol class
var Symbol = function(game, x, y, key, index) {
    Phaser.Sprite.call(this, game, x, y, key);
    this.scale.set(0.26);
    this.index = index;
    this.tweenY = this.y;
};
Symbol.prototype = Object.create(Phaser.Sprite.prototype);
Symbol.prototype.constructor = Symbol;

Symbol.prototype.update = function() {
    this.y = this.tweenY % 1500;
    
    var middle = 600;
    var range = 100;
    if (this.y < middle - range) this.alpha = 1.0 - (middle - range - this.y)*0.005;
    else if (this.y > middle + range) this.alpha = 1.0 - (this.y - middle - range)*0.005;
    else this.alpha = 1.0;
};

Symbol.prototype.spin = function(rand) {
    this.tweenY = this.y;
    
    var target = this.tweenY + 500;
    var start = game.add.tween(this).to({tweenY: target}, 1000, Phaser.Easing.Back.In, false, this.index*200);
    
    var offset = 1700 + (this.index * 1800);
    target += offset + (rand * 150);
    var mid = game.add.tween(this).to({tweenY: target}, offset/1.85, Phaser.Easing.Linear.InOut);
    
    target += 500;
    var end = game.add.tween(this).to({tweenY: target}, 1000, Phaser.Easing.Back.Out);
    
    var isLast = this.y == 600 && this.index == 4;
    end.onComplete.add(function() {
        reelStop.play();
        if (isLast) {
            game.time.events.add(100, checkResults);
        }
    });
    
    start.chain(mid, end);
    start.start();
};

// Reel class
var Reel = function(game, index) {
    Phaser.Group.call(this, game);

    for (var i = assets.length - 1; i > 0; i--) {
        var j = game.rnd.integerInRange(0, i);
        var temp = assets[j];
        assets[j] = assets[i];
        assets[i] = temp;
    }
    
    for (var i = 0; i < assets.length; i++) {
        this.add(new Symbol(game, index*80, i*150, assets[i], index));
    }
};

Reel.prototype = Object.create(Phaser.Group.prototype);
Reel.prototype.constructor = Reel;

Reel.prototype.spin = function(rand) {
    this.forEach(function(symbol) {
        symbol.spin(rand);
    });
};

// Line Graphics class
var Line = function(game) {
    Phaser.Graphics.call(this, game);
    this.filters = [game.add.filter('Glow')];
    this.lines = [];
    this.drawing = false;
    this.perc = 0;
    this.all = false;
    this.index = 0;
    this.lastPos = [];
};

Line.prototype = Object.create(Phaser.Graphics.prototype);
Line.prototype.constructor = Line;

Line.prototype.update = function() {
    if (this.drawing && this.lines.length > 0) {
        if (this.all) {
            if (this.perc <= 1) {
                for (var i = 0; i < this.lines.length; i++) {
                    this.drawSingleLine(i);
                }
                this.perc += game.time.physicsElapsed*0.5;
            }
            else {
                this.all = false;
                this.perc = 0;
                this.clear();
            }
        }
        else {
            if (this.perc <= 1) {
                this.drawSingleLine(this.index % this.lines.length);
                this.perc += game.time.physicsElapsed*0.5;
            }
            else {
                this.index++;
                this.perc = 0;
                this.clear();
            }
        }
    }
};

Line.prototype.drawLines = function() {
    this.drawing = true;
    this.perc = 0;
    this.all = true;
    this.index = 0;
    this.lastPos = [];
    this.clear();
};

Line.prototype.stopDrawing = function() {
    this.drawing = false;
    this.clear();
};

Line.prototype.drawSingleLine = function(index) {
    if (this.perc == 0) this.lastPos[index] = {x: this.lines[index].x[0], y: this.lines[index].y[0]};
    
    this.moveTo(this.lastPos[index].x, this.lastPos[index].y);

    if (this.lines[index].included[Math.ceil(this.perc*6)]) this.lineStyle(6, 0xffffff);
    else this.lineStyle(2, 0xffffff);

    var x = Math.round(game.math.catmullRomInterpolation(this.lines[index].x, this.perc));
    var y = Math.round(game.math.catmullRomInterpolation(this.lines[index].y, this.perc));
    this.lineTo(x, y);
    
    this.lastPos[index].x = x;
    this.lastPos[index].y = y;
}

// Glow shader
Phaser.Filter.Glow = function (game) {
    Phaser.Filter.call(this, game);

    this.fragmentSrc = [
        "precision lowp float;",
        "varying vec2 vTextureCoord;",
        "varying vec4 vColor;",
        'uniform sampler2D uSampler;',

        'void main() {',
            'vec4 sum = vec4(0);',
            'vec2 texcoord = vTextureCoord;',
            'for(int xx = -4; xx <= 4; xx++) {',
                'for(int yy = -3; yy <= 3; yy++) {',
                    'float dist = sqrt(float(xx*xx) + float(yy*yy));',
                    'float factor = 0.0;',
                    'if (dist == 0.0) {',
                        'factor = 2.0;',
                    '} else {',
                        'factor = 2.0/abs(float(dist));',
                    '}',
                    'sum += texture2D(uSampler, texcoord + vec2(xx, yy) * 0.002) * factor;',
                '}',
            '}',
            'gl_FragColor = sum * 0.025 + texture2D(uSampler, texcoord);',
        '}'
    ];
};

Phaser.Filter.Glow.prototype = Object.create(Phaser.Filter.prototype);
Phaser.Filter.Glow.prototype.constructor = Phaser.Filter.Glow;

// Main game functions
function preload() {
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    
    for (var i = 0; i < assets.length; i++) {
        game.load.image(assets[i], 'assets/img/' + assets[i] + '.jpg');
    }
    game.load.image('button', 'assets/img/button_up.png');
    game.load.image('btn_fullscreen', 'assets/img/btn_fullscreen.png');
    game.load.bitmapFont('kenfuture', 'assets/font/kenfuture.png', 'assets/font/kenfuture.fnt');
    game.load.audio('reelstop', 'assets/sound/reelstop.wav');
    game.load.audio('music', 'assets/sound/music.wav');
    game.load.audio('winning', 'assets/sound/winning.wav');
}

function create() {
    game.world.setBounds(0, 0, 800, 1500);
    game.camera.y = 380;
    game.stage.backgroundColor = "#141c3d";
    
    reels = game.add.group();
    for (var i = 0; i < 5; i++) {
        reels.add(new Reel(game, i));
    }
    reels.x = reels_position;
    
    graphics = game.world.add(new Line(game));

    var btnFullScreen = game.add.button(555, 400, 'button', clickFullScreen);
    btnFullScreen.alpha = 0.7;
    var btnFullScreenText = game.add.bitmapText(575, 418, 'kenfuture', 'FULL SCREEN', 18);
    btnFullScreenText.alpha = 0.8;
    
    var btnStart = game.add.button(555, 910, 'button', clickSpinButton);
    btnStart.alpha = 0.7;
    var btnStartText = game.add.bitmapText(595, 922, 'kenfuture', 'START', 30);
    btnStartText.alpha = 0.8;

    var btnBetMore = game.add.button(650, 830, 'button', clickBetMore);
    btnBetMore.alpha = 0.7;
    btnBetMore.scale.setTo(0.2, 0.8);
    var btnBetMoreText = game.add.bitmapText(659, 839, 'kenfuture', '+', 30);
    btnBetMoreText.alpha = 0.8;

    var btnBetLess = game.add.button(600, 830, 'button', clickBetLess);
    btnBetLess.alpha = 0.7;
    btnBetLess.scale.setTo(0.2, 0.8);
    var btnBetLessText = game.add.bitmapText(609, 839, 'kenfuture', '-', 30);
    btnBetLessText.alpha = 0.8;

    var payoutTitleText = game.add.bitmapText(542, 522, 'kenfuture', 'PAYOUT VALUES', 22);
    var payoutText = game.add.bitmapText(542, 562, 'kenfuture', "3 same symobls = 125\n\n4 same symobls = 625\n\n5 same symobls = 3125\n\nDiamond symbol is joker", 14);

    creditsText = game.add.bitmapText(25, 935, 'kenfuture', 'Credits: ' + credits, 32);
    scoreText = game.add.bitmapText(25, 905, 'kenfuture', 'Winner paid: 0', 16);
    betText = game.add.bitmapText(584, 882, 'kenfuture', 'Bet: 100 * ' + bet_multiply, 20);
    
    reelStop = game.add.audio('reelstop');
    music = game.add.audio('music');
    winning = game.add.audio('winning');

    music.play("",0,0.2,true);
}

function update() {
    
}

function clickSpinButton() {
    if (spinning || credits < 100*bet_multiply) return;
    
    spinning = true;

    music.volume = 0.6;
    updateCredits(-(100*bet_multiply));
    graphics.stopDrawing();
    scoreText.text = 'Winner paid:';
    
    reels.forEach(function(reel) {
        var rand = game.rnd.integerInRange(0, 9);
        reel.spin(rand);
    });
}

function clickBetMore() {
    if (spinning || bet_multiply>=5) return;

    bet_multiply ++;
    betText.text = 'Bet: 100 * ' + bet_multiply;
}

function clickBetLess() {
    if (spinning  || bet_multiply<=1) return;

    bet_multiply--;
    betText.text = 'Bet: 100 * ' + bet_multiply;
}

function clickFullScreen() {
    if (game.scale.isFullScreen) {
        game.scale.stopFullScreen();
    }
    else {
        game.scale.startFullScreen(true);
    }
}

function checkResults() {
    var results = [];
    for (var i = 0; i < 3; i++)
        results[i] = [];
    
    graphics.lines = [];
    
    music.volume = 0.2;
    var score = 0;
    
    reels.forEach(function(reel) {
        reel.forEach(function(symbol) {
            if (symbol.y == 450)
                results[0][symbol.index] = symbol;
            else if (symbol.y == 600)
                results[1][symbol.index] = symbol;
            else if (symbol.y == 750)
                results[2][symbol.index] = symbol;
        });
    });
    
    for (var i = 0; i < paylines.length; i++) {
        var symbol = results[paylines[i][0]][0].key;
        var j = 1;
        for (; j < paylines[i].length; j++) {
            var current = results[paylines[i][j]][j].key;
            
            if (symbol == joker) {
                symbol = current;
            }
            else {
                if (current != symbol && current != joker)
                    break;
            }
        }
        
        if (j >= 3) {
            var lineX = [];
            var lineY = [];
            var included = [];
            for (var k = 0; k < paylines[i].length; k++) {
                var sprite = results[paylines[i][k]][k];
                
                if (k == 0) {
                    lineX.push(sprite.x + sprite.width/2 + reels_position - 100);
                    lineY.push(sprite.y + sprite.height/2);
                    included.push(true);
                }
                
                lineX.push(sprite.x + sprite.width/2 + reels_position);
                lineY.push(sprite.y + sprite.height/2);
                included.push(k < j);
                
                if (k == 4) {
                    lineX.push(sprite.x + sprite.width/2 + reels_position + 100);
                    lineY.push(sprite.y + sprite.height/2);
                    included.push(k < j);
                }
            }
            graphics.lines.push({x: lineX, y: lineY, included: included});
            score += Math.pow(5, j);
        }
    }
    
    graphics.drawLines();
    if (score > 0){
        score *= bet_multiply;
        scoreText.text = 'Winner paid: ' + score;
        updateCredits(score);
    }else{
        scoreText.text = 'Winner paid: 0';
    }

    spinning = false;
}

function updateCredits(amount) {
    if (amount > 0) winning.play();
    
    credits += amount;
    creditsText.text = 'Credits: ' + credits;
    
    var updateText = game.add.bitmapText(40 + creditsText.width, creditsText.y, 'kenfuture', (amount<0?'':'+') + amount, 32);
    var updateTween = game.add.tween(updateText).to({alpha: 0, y: updateText.y - 10}, 1000, Phaser.Easing.Linear.InOut, true);
    updateTween.onComplete.add(function() {
        updateText.destroy();
    });
}