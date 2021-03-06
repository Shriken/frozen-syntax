BRAIN.setConsts({
	chassis_shape : [
			[10, -9],
			[10, -10],
			[-15, -10],
			[-15, -9],
			[-8, -6],
			[-8, 6],
			[-15, 9],
			[-15, 10],
			[10, 10],
			[10, 9],
			[8, 6],
			[8, -6]
			],
	turret_shape : [
			[-3, -1],
			[-13, -1],
			[-13, 1],
			[-3, 1],
			[0, 3],
			[2, 0],
			[0, -3],
			],
    bullet_shape : [
            [0, -1.5],
            [-3, -1],
            [-4, 0],
            [-3, 1],
            [0, 1.5]
            ]
});

BRAIN.Renderer = (function() {

	var setup = function() {
		BRAIN.canvas = document.getElementById("canvas"),
		BRAIN.ctx = BRAIN.canvas.getContext("2d");
        BRAIN.circuit = generateCircuit(10, 10);
	};

    var generateCircuit = function(width, height) {
        var map = [];
        for (var i = 0; i < width; i++) {
            var row = [];
            for (var j = 0; j < height; j++) {
                row.push(false);
            }
            map.push(row);
        }
        var circuit = [];
        for (var j = 0; j < 1000; j++) {
            var choices = [-1, 1];
            var path = [];
            var prevPt;
            // Find a coordinate that is not already taken
            do {
                // Pick the starting coords, make sure they're even to avoid overlaps
                var sx = Math.floor(Math.random() * width / 2) * 2;
                var sy = Math.floor(Math.random() * height / 2) * 2;

                prevPt = [sx, sy];
                map[sx][sy] = true; // Label this position as taken
            } while (!map[prevPt[0]][prevPt[1]]);
            for (var i = 0; i < 300; i++) {
                var dx = choices[Math.floor(Math.random() * choices.length)];
                var dy = choices[Math.floor(Math.random() * choices.length)];
                var nx = prevPt[0] + dx;
                var ny = prevPt[1] + dy;

                if (nx < 0) nx += Math.abs(dx) * 2;
                if (ny < 0) ny += Math.abs(dy) * 2;
                if (nx >= width) nx -= Math.abs(dx) * 2;
                if (ny >= height) ny -= Math.abs(dy) * 2;

                if (!map[nx][ny]) {
                    path.push([prevPt, [nx,ny]]);
                    prevPt = [nx, ny];
                    map[nx][ny] = true;
                } else {
                    // Skip this one if that spot is already taken
                    continue;
                }

            }
            // Don't put really short paths on, they just look ugly
            // Min path length is the diagonal length of the world / 8. Bent up, it looks good
            var min_path_len = Math.sqrt(width * width + height * height)/8;
            if (path.length > min_path_len) {
                circuit.push(path);
            } else {
                // We need to unset all the places this path touches in the map
                for (var i = 0; i < path.length; i++) {
                    map[path[i][0][0]][path[i][0][1]] = false;
                    map[path[i][1][0]][path[i][1][1]] = false;
                }
            }
        }
        return circuit;
    }

	var render = function() {
		var zoomCenter = BRAIN.zoomCenter,
		    zoomLevel = BRAIN.zoomLevel,
		    ctx = BRAIN.canvas.getContext("2d");

		clearScreen();
		ctx.save();

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.scale(zoomLevel, zoomLevel);
		ctx.translate(-zoomCenter[0], -zoomCenter[1]);

        drawCircuit();

		drawSelection();
        for (var i = 0; i < BRAIN.bullets.length; i++) {
            drawBullet(BRAIN.bullets[i]);
        }
		// Draw chassis shadow
		var shadowColor = "rgba(0, 0, 0, .2)";
		ctx.fillStyle = shadowColor;
		ctx.beginPath();
		for (var i = 0; i < BRAIN.units.length; i++) {
            drawChassisShadow(BRAIN.units[i]);
		}
		ctx.fill();
		for (var i = 0; i < BRAIN.units.length; i++) {
            drawChassis(BRAIN.units[i]);
		}
        ctx.fillStyle = shadowColor;
        ctx.beginPath();
		for (var i = 0; i < BRAIN.units.length; i++) {
            drawTurretShadow(BRAIN.units[i]);
		}
        ctx.fill();
		for (var i = 0; i < BRAIN.units.length; i++) {
            drawTurret(BRAIN.units[i]);
		}
		for (var i = 0; i < BRAIN.particles.length; i++) {
			BRAIN.particles[i].renderParticle(BRAIN.particles[i]);
		}
        for (var i = 0; i < BRAIN.walls.length; i++) {
            drawWall(BRAIN.walls[i]);
        }
        ctx.strokeStyle = "rgb(0,0,0)";
        ctx.strokeRect(0, 0, BRAIN.bounds.width, BRAIN.bounds.height);
		ctx.restore();

		if (BRAIN.gameOver) {
			drawGameOver();
		}
	};

	var clearScreen = function() {
		var canvas      = BRAIN.canvas,
		    ctx         = BRAIN.ctx;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

    var drawCircuit = function() {
        var ctx = BRAIN.ctx;
        var scalePt = function(pt) {
            return [pt[0] * 10, pt[1] * 10];
        }

        var oldWidth = ctx.lineWidth;
        ctx.lineWidth = 5;
        // Draw the whole path very lightly 
        ctx.strokeStyle = "rgba(255, 255, 255, .1)";
        ctx.beginPath();
        for (var i = 0; i < BRAIN.circuit.length; i++) {
            for (var j = 0; j < BRAIN.circuit[i].length; j++) {
                var path = BRAIN.circuit[i][j];
                var pt1 = scalePt(path[0]);
                var pt2 = scalePt(path[1]);
                ctx.moveTo(pt1[0], pt1[1]);
                ctx.lineTo(pt2[0], pt2[1]);
            }
        }
        ctx.stroke();
        // Draw the current part with a heavy stroke
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, .2)";
        for (var i = 0; i < BRAIN.circuit.length; i++) {
            var path = BRAIN.circuit[i][0];
            var pt1 = scalePt(path[0]);
            var pt2 = scalePt(path[1]);
            ctx.moveTo(pt1[0], pt1[1]);
            ctx.lineTo(pt2[0], pt2[1]);
        }
        ctx.stroke();
        ctx.lineWidth = oldWidth;
    }

    var drawWall = function(wall) {
        var ctx = BRAIN.ctx;
        ctx.translate(wall.x, wall.y);

        ctx.fillStyle = "rgba(0,0,0, .2)";
        ctx.fillRect(-3,3, wall.width * 1.01, wall.height * 1.01);

        ctx.fillStyle = "rgb(160,180,200)";
        ctx.lineWidth = 3;
        ctx.fillRect(0, 0, wall.width, wall.height);
        
        ctx.translate(-wall.x, -wall.y);
    };

    var drawBullet = function(bullet) {
        var ctx = BRAIN.ctx;
        ctx.translate(bullet.x, bullet.y);

        var theta = bullet.direction + Math.PI;
        ctx.rotate(theta);

        ctx.fillStyle = "rgb(255,255,255)";

        ctx.beginPath();
        ctx.moveTo(BRAIN.bullet_shape[0][0], BRAIN.bullet_shape[0][1]);
        for (var i = 0; i < BRAIN.bullet_shape.length; i++) {
            ctx.lineTo(BRAIN.bullet_shape[i][0], BRAIN.bullet_shape[i][1]);
        }
        ctx.closePath();
        ctx.fill();

        ctx.rotate(-theta);
        ctx.translate(-bullet.x, -bullet.y);
    }

	var drawSelection = function() {
		if (BRAIN.selectedUnit == null) {
			return;
		}

		var ctx = BRAIN.ctx,
		    unit = BRAIN.selectedUnit;

		ctx.save();
		ctx.translate(BRAIN.selectedUnit.x, BRAIN.selectedUnit.y);
		var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
		grd.addColorStop(0, unit.team == 0 ? "rgba(30,200,30,255)"
		                                   : "rgba(220,30,30,255)");
		grd.addColorStop(1, unit.team == 0 ? "rgba(30,200,30,0)"
		                                   : "rgba(220,30,30,0)");
		ctx.fillStyle = grd;
		ctx.fillRect(-20, -20, 40, 40);
		ctx.restore();
	};

	var renderExplosion = function(expl) {
		var ctx = BRAIN.ctx;
		var r = Math.floor(expl.r);
		var g = Math.floor(expl.g);
		var b = Math.floor(expl.b);
		var a = Math.floor(expl.a);
		ctx.translate(expl.x, expl.y);

		var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, expl.rad);
		grd.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + a + ")");
		grd.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
		ctx.fillStyle = grd;
		ctx.fillRect(-expl.rad, -expl.rad, expl.rad*2, expl.rad*2);

		ctx.translate(-expl.x, -expl.y);
	};

    var drawChassisShadow = function(unit) {
		var ctx = BRAIN.ctx;

		ctx.translate(unit.x, unit.y);
		var theta = unit.direction + Math.PI;
		ctx.rotate(theta);

		var shadowTheta = theta + Math.PI/4;
		var shadowx = -3 * Math.cos(shadowTheta);
		var shadowy = 3 * Math.sin(shadowTheta);

		ctx.moveTo(BRAIN.chassis_shape[0][0] * 1.1 + shadowx,
		           BRAIN.chassis_shape[0][1] * 1.1 + shadowy);
		for (var i = 0; i < BRAIN.chassis_shape.length; i++) {
			ctx.lineTo(BRAIN.chassis_shape[i][0] * 1.1 + shadowx,
			           BRAIN.chassis_shape[i][1] * 1.1 + shadowy);
		}
		ctx.closePath();

        ctx.rotate(-theta);
        ctx.translate(-unit.x, -unit.y);
    }

	var drawChassis = function(unit) {
		var ctx = BRAIN.ctx;
        ctx.translate(unit.x, unit.y);
        var theta = unit.direction + Math.PI;
        ctx.rotate(theta);

        var teamColor = unit.team == 0 ? "rgb(30, 200, 30)" : "rgb(220, 30, 30)";
        var strokeColor = unit.team == 0 ? "rgb(15,100,15)" : "rgb(110, 15, 15)";
        if (unit.dead) {
            teamColor = "rgb(40,40,40)";
            strokeColor = "rgb(10,10,10)";
        }
		if (unit.hidden) {
		    temp = teamColor; teamColor = strokeColor; strokeColor = temp;
		}
		ctx.fillStyle = teamColor;
        ctx.strokeStyle = strokeColor;
		// Draw chassis
		ctx.beginPath();
		ctx.moveTo(BRAIN.chassis_shape[0][0],
		           BRAIN.chassis_shape[0][1]);
		for (var i = 0; i < BRAIN.chassis_shape.length; i++) {
			ctx.lineTo(BRAIN.chassis_shape[i][0],
			           BRAIN.chassis_shape[i][1]);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
        
        ctx.rotate(-theta);
        ctx.translate(-unit.x, -unit.y);
	};

    var drawTurretShadow = function(unit) {
		var ctx = BRAIN.ctx;

		ctx.translate(unit.x, unit.y);
		var theta = unit.direction + Math.PI;
		ctx.rotate(theta);

		var shadowTheta = theta + Math.PI/4;
		var shadowx = -Math.cos(shadowTheta);
		var shadowy = Math.sin(shadowTheta);

		// Draw chassis shadow
		ctx.moveTo(BRAIN.turret_shape[0][0] * 1.1 + shadowx,
		           BRAIN.turret_shape[0][1] * 1.1 + shadowy);
		for (var i = 0; i < BRAIN.turret_shape.length; i++) {
			ctx.lineTo(BRAIN.turret_shape[i][0] * 1.1 + shadowx,
			           BRAIN.turret_shape[i][1] * 1.1 + shadowy);
		}
		ctx.closePath();

        ctx.rotate(-theta);
        ctx.translate(-unit.x, -unit.y);
    }

	var drawTurret = function(unit) {
		var ctx = BRAIN.ctx;
        ctx.translate(unit.x, unit.y);
        var theta = unit.direction + Math.PI;
        ctx.rotate(theta);

        var teamColor = unit.team == 0 ? "rgb(30, 200, 30)" : "rgb(220, 30, 30)";
        var strokeColor = unit.team == 0 ? "rgb(15,100,15)" : "rgb(110, 15, 15)";
        if (unit.dead) {
            teamColor = "rgb(40,40,40)";
            strokeColor = "rgb(10,10,10)";
        }
		if (unit.hidden) {
		    temp = teamColor; teamColor = strokeColor; strokeColor = temp;
		}
		ctx.fillStyle = teamColor;
        ctx.strokeStyle = strokeColor;
		// Draw chassis
		ctx.beginPath();
		ctx.moveTo(BRAIN.turret_shape[0][0],
		           BRAIN.turret_shape[0][1]);
		for (var i = 0; i < BRAIN.turret_shape.length; i++) {
			ctx.lineTo(BRAIN.turret_shape[i][0],
			           BRAIN.turret_shape[i][1]);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
        
        ctx.rotate(-theta);
        ctx.translate(-unit.x, -unit.y);
	};

	var renderBulletSmoke = function(smoke) {
		var theta = Math.random() * Math.PI * 2;
		BRAIN.ctx.fillStyle = "rgba(100, 100, 100, .5)";
		BRAIN.ctx.translate(smoke.x, smoke.y);
		BRAIN.ctx.rotate(theta);
		BRAIN.ctx.fillRect(-smoke.rad * smoke.age/30, -smoke.rad * smoke.age/30,
		smoke.rad * 2 * smoke.age/30, smoke.rad*2 * smoke.age/30);
		BRAIN.ctx.rotate(-theta);
		BRAIN.ctx.translate(-smoke.x, -smoke.y);
	};

    var renderMuzzleFlash = function(flash) {
        var ctx = BRAIN.ctx;
        ctx.translate(flash.x, flash.y);
        ctx.rotate(flash.theta);
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.beginPath();
        var theta = Math.PI / 4;
        ctx.moveTo(0, 0);
        var togg = true;
        for (var theta = Math.PI/3; theta > -Math.PI/3; theta-=.2) {
            var fun = togg ? Math.min : Math.max;
            var effRad = flash.rad * fun(Math.random() + .3, .7);
            var x = Math.cos(theta) * effRad;
            var y = Math.sin(theta) * effRad;
            ctx.lineTo(x, y);
            togg = !togg;
        }
        ctx.closePath();
        ctx.fill();

        ctx.rotate(-flash.theta);
        ctx.translate(-flash.x, -flash.y);
    }

	var drawGameOver = function() {
		var ctx = BRAIN.ctx,
			canvas = BRAIN.canvas,
			windowWidth = 200,
			windowHeight = 75;

		ctx.fillStyle = "rgb(30,200,30)";
		ctx.fillRect((canvas.width - windowWidth) / 2, 0, windowWidth, windowHeight);
		ctx.font = "30px Arial";
		ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillText("Game Over", (canvas.width - windowWidth) / 2 + 23,
		             windowHeight - 28);
	};

	return {
		setup : setup,
		render : render,
		renderExplosion : renderExplosion,
		renderBulletSmoke : renderBulletSmoke,
        renderMuzzleFlash : renderMuzzleFlash,
        generateCircuit : generateCircuit,
	};
})();
