var AFRAME = require('aframe');
var extras = require('aframe-extras');
extras.registerAll();
var THREE = AFRAME.THREE;
var mapdata = require('exports-loader?mapdata!../map.js');
var lights = require('exports-loader?lights!../map.js');

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
var SHIPSIZE = 1;
var COLLISION_ENABLED = true;

document.addEventListener('keydown', function(x) {
  keyboard.state[x.code] = true;
});
document.addEventListener('keyup', function(x) {
  keyboard.state[x.code] = false;
});
document.addEventListener('keypress', function(x) {
  if (x.code === 'Space') {
    COLLISION_ENABLED = !COLLISION_ENABLED;
  }
  if (x.code === 'KeyR') {
    var newLight = {
      position: document.getElementById('ship').object3D.position.clone(),
      intensity: 3,
      decay: 2,
      distance: 20
    };
    addLight(document.querySelector('a-entity[create-lights]'), newLight);
    lights.push(newLight);
    console.log(lights);
  }
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
    faces.push(face1);
    var face2 = new THREE.Face3(offset + 0, offset + 2, offset + 3);
    geom.faces.push(face2);
    faces.push(face2);
  }
  if (vertarray.length == 3) {
    var face = new THREE.Face3(offset + 0, offset + 1, offset + 2);
    geom.faces.push(face);
    faces.push(face);
  }
}

AFRAME.registerGeometry('descent-level-geom', {
  init: function() {
    var geom = createGeom();
    colobjects.push(geom);
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
  quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

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

var FOO = 0;

var addLight = function(elem, light) {
  var el = document.createElement('a-entity');
  el.setAttribute(
    'light',
    `type: point; intensity: ${light.intensity}; distance: ${
      light.distance
    }; decay: ${light.decay}`
  );
  el.setAttribute(
    'position',
    AFRAME.utils.coordinates.stringify(light.position)
  );
  elem.appendChild(el);
};

AFRAME.registerComponent('create-lights', {
  init: function() {
    lights.forEach(light => {
      addLight(this.el, light);
    });
  }
});

AFRAME.registerComponent('descent-controls', {
  init: function() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.near = 0;
    this.raycaster.far = SHIPSIZE;
  },
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

    //Check for collisions and push out if needed
    if (COLLISION_ENABLED) {
      var TEMPVEC = new THREE.Vector3();
      for (var colobj of colobjects) {
        for (var face of colobj.faces) {
          if (!face._tri) {
            face._tri = new THREE.Triangle(
              colobj.vertices[face.a],
              colobj.vertices[face.b],
              colobj.vertices[face.c]
            );
          }
          face._tri.closestPointToPoint(shipElement.position, TEMPVEC);
          var dist = TEMPVEC.distanceTo(shipElement.position);
          if (dist < SHIPSIZE) {
            // need to bump the ship!
            var norm = face._tri.normal();
            norm.multiplyScalar(SHIPSIZE - dist);
            shipElement.position.add(norm);
          }
          if (FOO < 10) {
            FOO++;
          }
        }
      }
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
