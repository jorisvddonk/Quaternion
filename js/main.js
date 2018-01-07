var AFRAME = require('aframe');
var extras = require('aframe-extras');
extras.registerAll();
var THREE = AFRAME.THREE;
var mapdata = require('exports-loader?mapdata!../map.js');

var scene, renderer, camera;
var quat, level, ship;
var camera_rotation_speed = new THREE.Vector3(0, 0, 0);
var camera_position_speed = new THREE.Vector3(0, 0, 0);
var keyboard = {
  state: {
    ArrowDown: false,
    ArrowUp: false,
    KeyE: false,
    KeyQ: false,
    ArrowRight: false,
    ArrowLeft: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false
  },
  pressed: function(keyname) {
    return this.state[keyname];
  }
};
var gamepadFound = false;
var gamepad;
var GAMEPAD_DEFAULT_DEADZONE = 0.2;
var VERTMULT = 20;
var colobjects = [];
var faces = [];
var obj;
var SHIPSIZE = 50;

document.addEventListener('keydown', function(x) {
  keyboard.state[x.code] = true;
});
document.addEventListener('keyup', function(x) {
  keyboard.state[x.code] = false;
});

function gamepad_deadzone(input, deadzone) {
  if (deadzone === undefined) {
    deadzone = GAMEPAD_DEFAULT_DEADZONE;
  }
  if (input > -deadzone && input < deadzone) {
    return 0;
  }
  return input;
}

function newvert(vertobj, x, y, z) {
  var vert = new THREE.Vector3(
    vertobj.X * VERTMULT,
    vertobj.Y * VERTMULT,
    vertobj.Z * VERTMULT
  );
  return vert;
}

function newwall(mapdata, vertarray, geom, x, y, z) {
  var offset = geom.vertices.length;

  for (var i in vertarray) {
    geom.vertices.push(newvert(mapdata.vertices[vertarray[i]], x, y, z));
  }

  if (vertarray.length == 4) {
    // emulate using 2 face3
    var face1 = new THREE.Face3(offset + 0, offset + 1, offset + 2);
    geom.faces.push(face1);
    face1._vertices = geom.vertices;
    faces.push(face1);
    var face2 = new THREE.Face3(offset + 0, offset + 2, offset + 3);
    geom.faces.push(face2);
    face2._vertices = geom.vertices;
    faces.push(face2);
  }
  if (vertarray.length == 3) {
    var face = new THREE.Face3(offset + 0, offset + 1, offset + 2);
    geom.faces.push(face);
    face._vertices = geom.vertices;
    faces.push(face);
  }
}

AFRAME.registerGeometry('descent-level', {
  init: function() {
    var geom = createGeom();
    console.log(geom);
    this.geometry = geom;
  }
});

function createGeom() {
  /*
  0 - left, front, top
  1 - left, front, bottom
  2 - right, front, bottom
  3 - right, front, top
  4 - left, back, top
  5 - left, back, bottom
  6 - right, back, bottom
  7 - right, back, top
  */
  //top: 0,3,4,7
  var geom = new THREE.Geometry();
  for (var i = 0; i < mapdata.length; i++) {
    if (mapdata[i].vertices.length == 8) {
      var tx = 0;
      var ty = 0;
      var tz = 0;
      for (var j = 0; j < mapdata[i].vertices.length; j++) {
        tx += mapdata[i].vertices[j].X;
        ty += mapdata[i].vertices[j].Y;
        tz += mapdata[i].vertices[j].Z;
      }
      var x = tx / 8;
      var y = ty / 8;
      var z = tz / 8;
      /*for (var j = 0; j < mapdata[i].vertices.length; j++) {
	            geom.vertices.push(newvert(mapdata[i].vertices[j],x,y,z));
			}*/

      if (mapdata[i].top === null) {
        newwall(mapdata[i], [0, 4, 7, 3], geom, x, y, z);
      }
      if (mapdata[i].front === null) {
        newwall(mapdata[i], [3, 2, 1, 0], geom, x, y, z);
      }
      if (mapdata[i].bottom === null) {
        newwall(mapdata[i], [2, 6, 5, 1], geom, x, y, z);
      }
      if (mapdata[i].back === null) {
        newwall(mapdata[i], [4, 5, 6, 7], geom, x, y, z);
      }
      if (mapdata[i].left === null) {
        newwall(mapdata[i], [7, 6, 2, 3], geom, x, y, z);
      }
      if (mapdata[i].right === null) {
        newwall(mapdata[i], [0, 1, 5, 4], geom, x, y, z);
      }
    } else {
      console.log('Ignoring invalid cube #' + i);
    }
  }
  geom.computeFaceNormals();
  geom.computeVertexNormals();
  geom.scale(0.01, 0.01, 0.01);

  quat = new THREE.Quaternion();
  //quat.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );

  //go go power rangers!
  //animate();

  //Test gamepad support
  if (!!navigator.getGamepads) {
    //TODO: improve this.
    //console.log("Gamepad support available.");
  } else {
    console.log(
      'Gamepad support unavailable. Please use a recent version of Google Chrome and enable gamepad support in <a href="chrome://flags">the Chrome flags settings window</a>.'
    );
  }
  return geom;
}

function render() {
  /*var cvect = new THREE.Vector3();
		cvect = cvect.copy(camera_position_speed);
		var ray = new THREE.Ray( camera.position, cvect.normalize(), 0, camera_position_speed.length()*100);
		//var intersects = ray.intersectFaces(faces);
		var intersects = ray.intersectObjects(colobjects);
		if (intersects.length > 0) {
			console.log(intersects.length);
			for (var i in intersects) {
				var sph = new THREE.SphereGeometry(50,2,2);
				var gm = new THREE.Mesh(sph);
				//console.log(">>>>");
				//console.log(gm);
				gm.position = intersects[i].point;
				scene.add(gm);
				intersects[i].object.material  = geommat2;
			}
		}*/

  //camera_position_speed.set(0,0,0);

  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

THREE.Ray.prototype.intersectFaces = function(faces) {
  var v0 = new THREE.Vector3(),
    v1 = new THREE.Vector3(),
    v2 = new THREE.Vector3();
  var pointInFace3 = function(p, a, b, c) {
    v0.sub(c, a);
    v1.sub(b, a);
    v2.sub(p, a);

    dot00 = v0.dot(v0);
    dot01 = v0.dot(v1);
    dot02 = v0.dot(v2);
    dot11 = v1.dot(v1);
    dot12 = v1.dot(v2);

    invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return u >= 0 && v >= 0 && u + v < 1;
  };
  var originCopy = new THREE.Vector3();
  var directionCopy = new THREE.Vector3();
  var vector = new THREE.Vector3();
  var normal = new THREE.Vector3();
  var intersectPoint = new THREE.Vector3();
  var dot;
  var intersect,
    intersects = [];
  var a = new THREE.Vector3();
  var b = new THREE.Vector3();
  var c = new THREE.Vector3();
  var d = new THREE.Vector3();
  for (f = 0, fl = faces.length; f < fl; f++) {
    face = faces[f];

    originCopy.copy(this.origin);
    directionCopy.copy(this.direction);

    objMatrix = new THREE.Matrix4(
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    );

    // determine if ray intersects the plane of the face
    // note: this works regardless of the direction of the face normal

    vector = objMatrix
      .multiplyVector3(vector.copy(face.centroid))
      .sub(originCopy);
    //normal = object.matrixRotationWorld.multiplyVector3( normal.copy( face.normal ) );
    normal = normal.copy(face.normal);
    dot = directionCopy.dot(normal);

    // bail if ray and plane are parallel

    if (Math.abs(dot) < 0.0001) continue;

    // calc distance to plane

    scalar = normal.dot(vector) / dot;

    // if negative distance, then plane is behind ray

    if (scalar < 0) continue;

    intersectPoint.add(originCopy, directionCopy.multiplyScalar(scalar));

    distance = originCopy.distanceTo(intersectPoint);

    if (distance < this.near) continue;
    if (distance > this.far) continue;

    if (face instanceof THREE.Face3) {
      a = objMatrix.multiplyVector3(a.copy(face._vertices[face.a]));
      b = objMatrix.multiplyVector3(b.copy(face._vertices[face.b]));
      c = objMatrix.multiplyVector3(c.copy(face._vertices[face.c]));

      if (pointInFace3(intersectPoint, a, b, c)) {
        intersect = {
          distance: distance,
          point: intersectPoint.clone(),
          face: face,
          faceIndex: f,
          object: object
        };

        intersects.push(intersect);
      }
    }
  }
  return intersects;
};

AFRAME.registerComponent('descent-controls', {
  tick: function(time, timeDelta) {
    // todo: use timedelta
    var shipElement = document.getElementById('ship').object3D;

    var ROTSPEED = 0.003;
    var MOVSPEED = 0.04;

    if (navigator.getGamepads()[0] !== undefined) {
      if (gamepadFound == false) {
        console.log('Gamepad found: ' + navigator.getGamepads()[0].id);
        gamepadFound = true;
        gamepad = navigator.getGamepads()[0];
      }
    }

    if (gamepad !== undefined) {
      //Rotation:
      var nv;
      if (!gamepad.buttons[11].pressed) {
        //Normal turning
        nv = new THREE.Vector3(
          ROTSPEED * gamepad_deadzone(gamepad.axes[3]),
          ROTSPEED * -gamepad_deadzone(gamepad.axes[2]),
          0
        );
      } else {
        //Left-right axes roll instead of turn
        nv = new THREE.Vector3(
          ROTSPEED * gamepad_deadzone(gamepad.axes[3]),
          0,
          ROTSPEED * -gamepad_deadzone(gamepad.axes[2])
        );
      }
      camera_rotation_speed = camera_rotation_speed.add(nv);

      //Position:
      var temp = new THREE.Vector3(
        MOVSPEED * gamepad_deadzone(gamepad.axes[0]),
        0,
        MOVSPEED * gamepad_deadzone(gamepad.axes[1])
      );
      temp.applyQuaternion(shipElement.quaternion);
      camera_position_speed = camera_position_speed.add(temp);
    }

    if (keyboard.pressed('ArrowDown')) {
      var nv = new THREE.Vector3(ROTSPEED, 0, 0);
      camera_rotation_speed = camera_rotation_speed.add(nv);
    }
    if (keyboard.pressed('ArrowUp')) {
      var nv = new THREE.Vector3(-ROTSPEED, 0, 0);
      camera_rotation_speed = camera_rotation_speed.add(nv);
    }
    if (keyboard.pressed('KeyE')) {
      var nv = new THREE.Vector3(0, 0, -ROTSPEED);
      camera_rotation_speed = camera_rotation_speed.add(nv);
    }
    if (keyboard.pressed('KeyQ')) {
      var nv = new THREE.Vector3(0, 0, ROTSPEED);
      camera_rotation_speed = camera_rotation_speed.add(nv);
    }
    if (keyboard.pressed('ArrowRight')) {
      var nv = new THREE.Vector3(0, -ROTSPEED, 0);
      camera_rotation_speed = camera_rotation_speed.add(nv);
    }
    if (keyboard.pressed('ArrowLeft')) {
      var nv = new THREE.Vector3(0, ROTSPEED, 0);
      camera_rotation_speed = camera_rotation_speed.add(nv);
    }

    if (keyboard.pressed('KeyW')) {
      var temp = new THREE.Vector3(0, 0, -MOVSPEED);
      temp.applyQuaternion(shipElement.quaternion);
      camera_position_speed = camera_position_speed.add(temp);
    }
    if (keyboard.pressed('KeyS')) {
      var temp = new THREE.Vector3(0, 0, MOVSPEED);
      temp.applyQuaternion(shipElement.quaternion);
      camera_position_speed = camera_position_speed.add(temp);
    }
    if (keyboard.pressed('KeyA')) {
      var temp = new THREE.Vector3(-MOVSPEED, 0, 0);
      temp.applyQuaternion(shipElement.quaternion);
      camera_position_speed = camera_position_speed.add(temp);
    }
    if (keyboard.pressed('KeyD')) {
      var temp = new THREE.Vector3(MOVSPEED, 0, 0);
      temp.applyQuaternion(shipElement.quaternion);
      camera_position_speed = camera_position_speed.add(temp);
    }

    // Apply drag:
    camera_position_speed.multiplyScalar(0.8);
    camera_rotation_speed.multiplyScalar(0.9);

    var rotationVector = camera_rotation_speed;
    var rotMult = 1;
    var tmpQuaternion = new THREE.Quaternion();
    tmpQuaternion
      .set(
        rotationVector.x * rotMult,
        rotationVector.y * rotMult,
        rotationVector.z * rotMult,
        1
      )
      .normalize();
    quat.multiply(tmpQuaternion);

    //Do the actual movement/rotation
    shipElement.setRotationFromQuaternion(quat);
    shipElement.position = shipElement.position.add(camera_position_speed);

    //Check for collisions
    var maxIntersect = null;
    var raycaster = new THREE.Raycaster();
    raycaster.near = 0;
    raycaster.far = SHIPSIZE;
    for (var vi = 0.1; vi < Math.PI; vi += Math.PI * 0.1) {
      for (var pi = 0; pi < Math.PI * 2; pi += Math.PI * 0.1) {
        pX = Math.sin(pi) * (Math.sin(vi) * SHIPSIZE);
        pY = Math.cos(pi) * (Math.sin(vi) * SHIPSIZE);
        pZ = Math.cos(vi) * SHIPSIZE;

        var rvect = new THREE.Vector3(pX, pY, pZ);

        raycaster.set(shipElement.position, rvect.normalize());
        var intersects = raycaster.intersectObjects(colobjects);
        if (intersects.length > 0) {
          for (var ii = 0; ii < intersects.length; ii++) {
            if (
              maxIntersect === null ||
              maxIntersect.distance > intersects[ii].distance
            ) {
              maxIntersect = intersects[ii];
              console.log(intersects[ii].distance);
              console.log(intersects[ii]);
            }
          }
        }
      }
    }

    if (maxIntersect != null && maxIntersect.distance > 0) {
      var camvec = new THREE.Vector3();
      camvec = camvec.subVectors(shipElement.position, maxIntersect.point);
      camvec = camvec.multiplyScalar(maxIntersect.distance / SHIPSIZE + 0.1);
      shipElement.position = shipElement.position.add(camvec);
    }
  }
});

AFRAME.registerComponent('debug-show-always', {
  init: function() {
    var mat = new THREE.MeshBasicMaterial({
      depthTest: false
    });
    this.material = this.el.getOrCreateObject3D('mesh').material = mat;
  }
});

AFRAME.registerComponent('follow-camera', {
  init: function() {},
  tick: function(time) {
    var camera = this.el.sceneEl.camera.el;
    if (camera) {
      // need to add the Y position of the parent element, as that's used to fix the height of the user in the world
      var pos = camera.getAttribute('position');
      var posS = { x: pos.x, y: pos.y, z: pos.z };
      this.el.setAttribute('position', posS);
    }
  }
});
