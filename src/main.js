
// прототип геймплея

options.__soundDisabled = 0; 

var level
    , rubber
    , blocks = []
    , big_blocks = 0
    , num_level=1
    , name_level=""
    , score = 0
    , stones=3;
    

function looperPostOne(f, delay) {
    if (f.__posted > 0) {
        f.__posted = _clearTimeout(f.__posted);
    }

    if (!f.__posted) {
        if (delay) {
            f.__posted = _setTimeout(() => {
                f.__posted = 0;
                f();
            }, delay);
        } else {
            f.__posted = -1;
            looperPost(() => {
                f.__posted = 0;
                f();
            });
        };
    }
}



function relImpactSpeed(bodyA, bodyB) {
    var va = bodyA.velocity, vb = bodyB.velocity
        , v = new Vector2(va.x - vb.x, va.y - vb.y);
    return v.__length();
}

function addBreakBlock(x, y, velocity){
    var breack_block = level.__addChildBox({
        __img: 'break_' + randomInt(1, 9),
        __ofs: [x, y, -20],
        __rotate: randomInt(0, 360),
        __physics: {
            __isStatic: false,
            __friction: 10,
            __frictionAir: 1,
            __frictionStatic: 50,
            __restitution: 0,
            __density: 1,
            __bodyType: 1
        }
    });
    looperPost(a => {
        if (breack_block.__ph_body){ 
            ph_Body.setVelocity(breack_block.__ph_body, new Vector2(velocity.x + randomFloat(-10, 10),velocity.y + randomFloat(-8, 3)));
            _setTimeout(() => {
                if (breack_block.__ph_body) {
                    initCollision(breack_block.__ph_body, breack_block, 50);
                    _setTimeout(() => {
                        if (!breack_block.__destructed) {
                            removeBlock(breack_block);
                        }
                    }, randomFloat(5, 10));
                }
            }, 1);
        }
    });
}

function awakeBlocks(){
    $each(blocks, b => {
        if (b && b.__ph_awake) b.__ph_awake();
    });
}

function removeBlock(block){
    removeFromArray(block, blocks);
    var size = block.__size, v = block.__ph_body.velocity;

    block.__removeFromParent();

    if (block.__needBreaks) {
        looperPostOne(awakeBlocks);
    }
    
    
    if (block.__needBreaks) {
        
        playSound('break_' + randomInt(1, 4), 0, 0, 0.5);
        
        var step = 50,
        bx = block.__x, 
        by = block.__y,
        sizeX = size.x,
        sizeY = size.y;
       
        var angleRad = (block.__rotate || 0) * (Math.PI / 180);
        var cosA = Math.cos(angleRad);
        var sinA = Math.sin(angleRad);

       
        for  (var x = -sizeX / 2 + step / 2; x < sizeX / 2; x += step) {
            for (var y = -sizeY / 2 + step / 2; y < sizeY / 2; y += step) {
                var rotatedX = bx + (x * cosA - y * sinA);
                var rotatedY = by + (x * sinA + y * cosA);

                addBreakBlock(rotatedX, rotatedY, v);
            }
        }

        score+=10;
        updateScore();
        big_blocks--;

        if (big_blocks == 0) {
            _setTimeout(() => {
                show_win();
            }, 1);
        }
    } else {
        if (random() > 0.5 && !windowManager.__hasOpenedWindow()) {
            playSound('break_' + randomInt(1, 4), 0, 0, 0.5);
        }
    }

}

function initCollision(body, node, hp, isRealBlock){
    blocks.push(node);
    body.__hp = hp;
    body.__onCollision = (speed, partnerNode) => {
        var dmg = floor(clamp((speed - 1) * (speed - 2), 0, 100));
        if (speed > 1.2) {
            dmg = 100;
        }
        if (dmg && body.__hp) {
            // consoleLog('damage', dmg);
            body.__hp = mmax(0, body.__hp - dmg);
            if (!body.__hp) {
                body.__onCollision = 0;
                looperPost(a => {
                    removeBlock(node);
                });
            }
        }
    }
}


function show_win() {

    playSound('win');

    // todo: посчитать очки игрока и выдать звезды

    if (stones > 0) {
        var bonus = stones * 30;
        score += bonus;
    }
    
    showWindow('win', wnd => {
        wnd.__setAliasesData({

            score: {
                __text: {
                    __text: "СЧЁТ: " + score
                }
            },

            _0: function(node) {
                if (node && score < 50) {
                    node.__removeFromParent();
                }
            },
            _1: function(node) {
                if (node && score < 80) {
                    node.__removeFromParent();
                }
            },
            _2: function(node) {
                if (node && score < 110) {
                    node.__removeFromParent();
                }
            },

            button_1: {
                __onTap(){
                    num_level++;
                    if (wnd && wnd.__close) wnd.__close();
                    if (num_level>3){
                        num_level=1;
                    }
                    initLevel(num_level);
                },
                __onTapHighlight: 1
            },
            button_2: {
                __onTap(){
                    if (wnd && wnd.__close) wnd.__close();
                    initLevel(num_level);
                },
                __onTapHighlight: 1
            }


        })
    })

}


function show_loss() {

    playSound('win');
    showWindow('loss', wnd => {
        wnd.__setAliasesData({

            button_2: {
                __onTap(){
                    if (wnd && wnd.__close) wnd.__close();
                    initLevel(num_level);
                },
                __onTapHighlight: 1
            }
        })
    })

}

function check_bullet(bullet) {
    if (!bullet || bullet.__destructed) return;

    var body = bullet.__ph_body;
    if (body) {
        var v = body.velocity;
        var speed = Math.sqrt(v.x * v.x + v.y * v.y);

        if (speed < 0.2) {
            bullet.__removeFromParent();
            
            if (stones === 0 && big_blocks > 0 && !windowManager.__hasOpenedWindow()) {
                show_loss();
            }
            return;
        }
    }

    looperPost(() => {
        check_bullet(bullet);
    });
}

function initLevel(num_level=1){

    if (level) {
        if (level.__close) level.__close();
        if (level.__removeFromParent) level.__removeFromParent();
        level = null;
    }

    name_level="level_"+num_level;
    big_blocks = 0;
    blocks = [];
    score = 0;
    stones = 3;
    // добавляем первый уровень на сцену
    level = scene
        .__addChildBox(name_level)
        .__setAliasesData({

            rubber(node) {
                rubber = node;
            },

            userInputArea: {
                __dragDist: 1,
                __drag(x, y, dx, dy) {
                    // натягиваем резинку
                    var dmouse = this.__dmouse = this.__worldPosition.__clone().sub(new Vector2(x, y));
                    rubber.__parent.__rotate = -dmouse.__angle() * RAD2DEG;
                    rubber.__width = dmouse.__length();
                },
                __dragStart() {
                    rubber.__killAllAnimations();
                },
                __dragEnd() {
                    if (stones <= 0) return;
                    playSound('punch');

                    stones--;
                    updateStones();

                    // отпускаем резинку
                    rubber.__anim({
                        __width: 10
                    }, 0.4, 0, easeElasticO);
                    var wp = this.__worldPosition
                        , bullet = level.__addChildBox({
                            __effect: 'tail',
                            __img: 'stone',
                            __size: [28, 28],
                            __ofs: [wp.x, wp.y, -20],
                            __physics: {
                                __isStatic: false,
                                __friction: 130,
                                __frictionAir: 0.2,
                                __frictionStatic: 500,
                                __restitution: 10,
                                __density: 4,
                                __bodyType: 1
                            }
                        }).update()
                        , velocity = this.__dmouse.__multiplyScalar(0.2);

                    if (bullet.__ph_body) {
                        ph_Body.setVelocity(bullet.__ph_body, velocity);
                    }

                    // пуля исчезает через 2 сек
                   /* _setTimeout(() => {
                        bullet.__removeFromParent();
                        if (stones === 0 && big_blocks > 0) {
                            show_loss();
                        }
                    }, 2);*/

                    check_bullet(bullet);

                }
            }
        });


    _setTimeout(a => {
        level.update(1);
        updateScore(); 
        updateStones(); 

        // настраиваем коллизии для отработки повреждения блоков
        ph_Events.on(ph_Engine, 'collisionStart', (event) => {
            var pairs = event.pairs, i, pair, bodyA, bodyB, speed;
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i];
                bodyA = pair.bodyA;
                bodyB = pair.bodyB;
                speed = relImpactSpeed(bodyA, bodyB);

                if (bodyA && bodyA.__onCollision) bodyA.__onCollision(speed);
                if (bodyB && bodyB.__onCollision) bodyB.__onCollision(speed);
            }
        });

        // проходим по уровню и инициализируем блоки
        level.__traverse(node => {
            var body = node.__ph_body;
            if (body && !body.isStatic) { // this is block
                node.__needBreaks = 1;
                big_blocks++;
                initCollision(body, node, 100);

                body.isSleeping = true;
            }
        });

    }, 0.01);
}

function updateScore() {
    if (level && level.__setAliasesData) {
        level.__setAliasesData({
            score: {
                __text: {
                    __text: "СЧЁТ: " + score
                }
            }
        });
    }
}

function updateStones() {
    if (level && level.__setAliasesData) {
        level.__setAliasesData({
            stones: {
                __text: {
                    __text: "КАМНИ: " + stones+" /3"
                }
            }
        });
    }
}

BUS.__addEventListener(
    __ON_GAME_LOADED, a => {
        initLevel(1);
        return 1;
    }
);
