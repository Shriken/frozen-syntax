var BRAIN = {
	frameLen : 1000 / 40,
	tickCount : 0,
	turn : 1,
	units : [],
    bullets : [],
    walls : [],
	obstacles : [],
	particles : [],
    bounds : {
        width: 1,
        height: 1
    },
	events : {},
	lastPing : 0,
	turnLen : 250,
	submittedCode : false,
	shouldRedraw : false,
    gameDemo : false,
    paused : false,
	gameOver : false,
    circuitUpdateTime : 2
}

window.onload = function() {
	BRAIN.setup();
	BRAIN.Renderer.setup();
	BRAIN.UI.setup();
	BRAIN.Particle.setup();
	BRAIN.run();
	BRAIN.getEvents();
    BRAIN.Renderer.render();
};

// With thanks to Wolfenstein3D-browser
BRAIN.setConsts = function(C) {
    for (var a in C) {
        if (C.hasOwnProperty(a) && !(a in BRAIN)) {
            BRAIN[a] = C[a];
        }
    }
}

// If v is undefined, return d, else return v
BRAIN.defaultTo = function(v, d) {
    return typeof v != "undefined" ? v : d;
}

BRAIN.setup = function() {
	// load and style codeInput textarea
	BRAIN.codeInput = ace.edit("codeInput");
	var LispMode = require("ace/mode/lisp").Mode;
	BRAIN.codeInput.getSession().setMode(new LispMode());
	BRAIN.codeInput.focus();
}

BRAIN.setEventList = function(newEvents) {
	BRAIN.events = newEvents;
    BRAIN.resetTime();
}

/*
 * Reset the game to it's state at the beginning of the game
 */
BRAIN.resetTime = function() {
	BRAIN.tickCount = 0;
	BRAIN.gameOver = false;
	BRAIN.units = [];
    BRAIN.bullets = [];
    BRAIN.walls = [];
	BRAIN.particles = [];
}

BRAIN.goToTick = function(time) {
    // If we're ahead of the time, reset to 0
    if (BRAIN.tickCount > time) {
        BRAIN.resetTime();
    }
    // Advance to the time
    while (BRAIN.tickCount < time) {
        BRAIN.tick();
    }
}

BRAIN.run = function() {
	var startTime = new Date().getMilliseconds(),
	    eventList = BRAIN.eventList,
	    particles = BRAIN.particles,
	    units     = BRAIN.units,
	    bullets   = BRAIN.bullets,
	    simulatedTick = false;

	// ping server for events if it's been long enough
	if (BRAIN.submittedCode && (new Date()).getTime() - BRAIN.lastPing > 5000) {
		BRAIN.lastPing = (new Date()).getTime();
		BRAIN.getEvents();
	}

	// Get the highest timestamp that has events
    var moreEvents = false
	var x; for (var i in BRAIN.events) { x = i; }; x = parseInt(x);
	moreEvents = BRAIN.tickCount < x;
    
    // Update the timeline slider's max value to the highest timestamp
    var slider = document.getElementById('slider');
    slider.max = x;
    // If the slider is not on our current tick, we need to change the tick to match the slider
    if (slider.value != BRAIN.tickCount) {
        BRAIN.goToTick(slider.value);
    }

	// logic
	if (BRAIN.events[BRAIN.tickCount]) {
        simulatedTick = true;
	}
	simulatedTick |= BRAIN.tickCount < BRAIN.turnLen * BRAIN.turn;
	if (simulatedTick && !BRAIN.paused) {
        BRAIN.tick();
    }

    // If we've hit the last turn, pause
    if (BRAIN.tickCount >= BRAIN.turnLen * BRAIN.turn && !BRAIN.gameDemo) {
        BRAIN.paused = true;
    }

    // Make the pause button indicate whether it's paused of playing, via the power of UNICODE :D
    var pauseButton = document.getElementById('pause');
    if (BRAIN.paused) {
        pauseButton.value = '▶';
    } else {
        pauseButton.value = '◼';
    }

    // Update the slider position to match the tick number
    slider.value = BRAIN.tickCount;

	// render
    BRAIN.shouldRedraw |= moreEvents; // If there are more events, we should render
	if (BRAIN.shouldRedraw) {
		BRAIN.Renderer.render();
	}
	BRAIN.shouldRedraw = false;

	var endTime = new Date().getMilliseconds();
	var frameLen = endTime - startTime;
	document.getElementById("fps-counter").innerText = frameLen + " millis";
	setTimeout(BRAIN.run, BRAIN.framelen - frameLen);
}



/*
 * Tick the game world forward exactly 1 tick
 */
BRAIN.tick = function() {
    var units = BRAIN.units,
        bullets = BRAIN.bullets,
        particles = BRAIN.particles;

    if (BRAIN.events[BRAIN.tickCount]) {
        for (var i = 0; i < BRAIN.events[BRAIN.tickCount].length; i++) {
            BRAIN.Event.runEvent(BRAIN.events[BRAIN.tickCount][i]);
        }
    }

    BRAIN.tickCount++;

    for (var i = 0; i < units.length; i++) {
        units[i].x += units[i].vx;
        units[i].y += units[i].vy;
    }
    for (var i = 0; i < bullets.length; i++) {
        bullets[i].x += bullets[i].vx;
        bullets[i].y += bullets[i].vy;
        var particle = BRAIN.Particle.newBulletSmoke(bullets[i].x, bullets[i].y);
        BRAIN.particles.push(particle);
    }
    for (var i = 0; i < particles.length; i++) {
        particles[i].updateParticle(particles[i]);
        if (particles[i].isDead(particles[i])) {
            particles.splice(i--, 1);
        }
    }
    // Update circuits
    for (var i = 0; i < BRAIN.circuit.length; i++) {
        if (!BRAIN.paused && BRAIN.tickCount % BRAIN.circuitUpdateTime == 0) {
            BRAIN.circuit[i].push(BRAIN.circuit[i].shift()); // Move the path to the back
        }
    }
}

BRAIN.restart = function() {
    document.getElementById('slider').value = 0;
    BRAIN.tickCount = 0;
    BRAIN.units = [];
    BRAIN.obstacles = [];
    BRAIN.particles = [];
    BRAIN.getEvents();
};

BRAIN.getEvents = function() {
    var updateTurn = function() {
        $.post('/action', {
            action : 'get-json',
            game_id : BRAIN.gameId,
            turn : BRAIN.turn
        }, function(data) {
            BRAIN.submittedCode = !data.success;
            delete data.success
            BRAIN.setEventList(data);
        }, 'json');
    }
    BRAIN.getTurn(updateTurn);
};

BRAIN.getTurn = function(callback) {
	$.post('/action', {
		action : 'get-turn',
		game_id : BRAIN.gameId
	}, function(data) {
		BRAIN.turn = parseInt(data) - 1;
        if (callback) { callback(); }
	}, 'json');
};

BRAIN.getState = function(turn) {
	$.post('/action', {
		action : 'get-state',
		game_id : BRAIN.gameId,
		turn : turn
	}, function(data) {
		// TODO
	});
};
