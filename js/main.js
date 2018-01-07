var THREE = require('exports-loader?THREE!../libs/three.js');
var jQuery = require('exports-loader?jQuery!../libs/jquery-1.8.1.min.js');
var THREEx = require('exports-loader?THREEx!../libs/THREEx.KeyboardState.js');
var noty = require('exports-loader?noty!../libs/noty/jquery.noty.js');
require('../libs/noty/layouts/bottomRight.js');
require('../libs/noty/themes/default.js');
var mapdata = require('exports-loader?mapdata!../map.js');

var scene, renderer, camera, projector;
var quat, level, ship;
var camera_rotation_speed = new THREE.Vector3(0, 0, 0);
var camera_position_speed = new THREE.Vector3(0, 0, 0);
var keyboard = new THREEx.KeyboardState();
var gamepadFound = false;
var gamepad;
var GAMEPAD_DEFAULT_DEADZONE = 0.2;
var VERTMULT = 20;
var colobjects = [];
var faces = [];
var obj;
var SHIPSIZE = 50;

function gamepad_deadzone(input, deadzone) {
  if (deadzone === undefined) {
    deadzone = GAMEPAD_DEFAULT_DEADZONE;
  }
  if (input > -deadzone && input < deadzone) {
    return 0;
  }
  return input;
}

function notify(text, type) {
  if (type === undefined) {
    type = 'alert';
  }
  noty({
    text: text,
    theme: 'default',
    layout: 'bottomRight',
    type: type,
    timeout: 4000
  });
}

function newvert(vertobj, x, y, z) {
  var vert = new THREE.Vector3(
    (vertobj.X - x) * VERTMULT,
    (vertobj.Y - y) * VERTMULT,
    (vertobj.Z - z) * VERTMULT
  );
  return vert;
}

var geommat2 = new THREE.MeshLambertMaterial({
  color: 0x666644,
  wireframe: true
});
var geommat = new THREE.MeshLambertMaterial({
  color: 0x666644,
  wireframe: false
});
function newwall(mapdata, vertarray, geom, x, y, z) {
  var geom = new THREE.Geometry();

  for (var i in vertarray) {
    geom.vertices.push(newvert(mapdata.vertices[vertarray[i]], x, y, z));
  }

  if (vertarray.length == 4) {
    // emulate using 2 face3
    var face1 = new THREE.Face3(0, 1, 2);
    geom.faces.push(face1);
    face1._vertices = geom.vertices;
    faces.push(face1);
    var face2 = new THREE.Face3(0, 2, 3);
    geom.faces.push(face2);
    face2._vertices = geom.vertices;
    faces.push(face2);
  }
  if (vertarray.length == 3) {
    var face = new THREE.Face3(0, 1, 2);
    geom.faces.push(face);
    face._vertices = geom.vertices;
    faces.push(face);
  }
  geom.computeFaceNormals();
  var geommesh = new THREE.Mesh(geom, geommat);
  geommesh.position = new THREE.Vector3(
    x * VERTMULT,
    y * VERTMULT,
    z * VERTMULT
  );
  scene.add(geommesh);
  colobjects.push(geommesh);
  console.log(geommesh);
}

function init(shipmodel, levelgeom) {
  // set the scene size
  var WIDTH = 800,
    HEIGHT = 600;

  // set some camera attributes
  var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

  // get the DOM element to attach to
  // - assume we've got jQuery to hand
  var $container = $('#content');

  // create a WebGL renderer, camera
  // and a scene
  renderer = new THREE.WebGLRenderer();
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

  scene = new THREE.Scene();

  // add the camera to the scene
  scene.add(camera);

  // the camera starts at 0,0,0
  // so pull it back
  camera.position.z = 300;

  // start the renderer
  renderer.setSize(WIDTH, HEIGHT);

  // attach the render-supplied DOM element
  $container.append(renderer.domElement);

  // create a new mesh with
  // sphere geometry - we will cover
  // the sphereMaterial next!
  /*var sphereMaterial =
	  new THREE.MeshLambertMaterial(
	    {
	      color: 0xCC0000
	    });*/
  /*sphere = new THREE.Mesh(
	  new THREE.CylinderGeometry(20,20,100,10,10,false));*/
  //var obj = new Physijs.BoxMesh(shipmodel, new THREE.MeshLambertMaterial({color: 0xff0000, wireframe: false}));
  obj = new THREE.Mesh(
    new THREE.SphereGeometry(50, 20, 20),
    new THREE.MeshLambertMaterial({ color: 0xff0000, wireframe: false })
  );
  obj.rotation.set(-Math.PI * 0.5, 0, Math.PI * 0.5);
  scene.add(obj);
  /*ship = new THREE.Object3D();
	ship.add(obj);
	ship.scale.set(50,50,50);
	ship.useQuaternion = true;
	scene.add(ship);*/

  projector = new THREE.Projector();

  var sph;

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
  for (var i = 0; i < mapdata.length; i++) {
    if (mapdata[i].vertices.length == 8) {
      var geom = null;
      //var geom = new THREE.Geometry();

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

  pointLight = new THREE.PointLight(0xffffff);
  pointLight.position = camera.position.clone();
  scene.add(pointLight);

  camera.useQuaternion = true;

  quat = new THREE.Quaternion();
  //quat.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );

  //go go power rangers!
  animate();

  //Test gamepad support
  if (!!navigator.getGamepads) {
    //TODO: improve this.
    //notify("Gamepad support available.", "success");
  } else {
    notify(
      'Gamepad support unavailable. Please use a recent version of Google Chrome and enable gamepad support in <a href="chrome://flags">the Chrome flags settings window</a>.',
      'error'
    );
  }

  // create the particle variables
  var particles = new THREE.Geometry(),
    pMaterial = new THREE.ParticleBasicMaterial({
      color: 0xffffff,
      size: 20
    });

  var pC = 0;
  for (var vi = 0.25; vi < Math.PI; vi += Math.PI * 0.25) {
    for (var pi = 0; pi < Math.PI * 2; pi += Math.PI * 0.25) {
      pX = Math.sin(pi) * (Math.sin(vi) * 100);
      pY = Math.cos(pi) * (Math.sin(vi) * 100);
      pZ = Math.cos(vi) * 100;
      pC += 1;
      particle = new THREE.Vector3(pX, pY, pZ);
      particles.vertices.push(particle);
    }
  }

  // create the particle variables
  var pMaterial = new THREE.ParticleBasicMaterial({
    color: 0xffffff,
    size: 20,
    map: THREE.ImageUtils.loadTexture('img/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  // create the particle system
  var particleSystem = new THREE.ParticleSystem(particles, pMaterial);

  // also update the particle system to
  // sort the particles which enables
  // the behaviour we want
  particleSystem.sortParticles = true;

  // add it to the scene
  scene.add(particleSystem);

  notify('Init successful', 'success');
}

function render() {
  var ROTSPEED = 0.003;
  var MOVSPEED = 4;

  if (navigator.getGamepads()[0] !== undefined) {
    if (gamepadFound == false) {
      notify('Gamepad found: ' + navigator.getGamepads()[0].id, 'success');
      gamepadFound = true;
      gamepad = navigator.getGamepads()[0];
    }
  }

  if (gamepad !== undefined) {
    //Rotation:
    var nv;
    if (gamepad.buttons[11] != 1) {
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
    temp.applyQuaternion(camera.quaternion);
    //camera.quaternion.multiplyVector3(temp);
    camera_position_speed = camera_position_speed.add(temp);
  }

  if (keyboard.pressed('down')) {
    var nv = new THREE.Vector3(ROTSPEED, 0, 0);
    camera_rotation_speed = camera_rotation_speed.add(nv);
  }
  if (keyboard.pressed('up')) {
    var nv = new THREE.Vector3(-ROTSPEED, 0, 0);
    camera_rotation_speed = camera_rotation_speed.add(nv);
  }
  if (keyboard.pressed('E')) {
    var nv = new THREE.Vector3(0, 0, -ROTSPEED);
    camera_rotation_speed = camera_rotation_speed.add(nv);
  }
  if (keyboard.pressed('Q')) {
    var nv = new THREE.Vector3(0, 0, ROTSPEED);
    camera_rotation_speed = camera_rotation_speed.add(nv);
  }
  if (keyboard.pressed('right')) {
    var nv = new THREE.Vector3(0, -ROTSPEED, 0);
    camera_rotation_speed = camera_rotation_speed.add(nv);
  }
  if (keyboard.pressed('left')) {
    var nv = new THREE.Vector3(0, ROTSPEED, 0);
    camera_rotation_speed = camera_rotation_speed.add(nv);
  }

  if (keyboard.pressed('w')) {
    var temp = new THREE.Vector3(0, 0, -MOVSPEED);
    camera.quaternion.multiplyVector3(temp);
    camera_position_speed = camera_position_speed.add(temp);
  }
  if (keyboard.pressed('s')) {
    var temp = new THREE.Vector3(0, 0, MOVSPEED);
    camera.quaternion.multiplyVector3(temp);
    camera_position_speed = camera_position_speed.add(temp);
  }
  if (keyboard.pressed('a')) {
    var temp = new THREE.Vector3(-MOVSPEED, 0, 0);
    camera.quaternion.multiplyVector3(temp);
    camera_position_speed = camera_position_speed.add(temp);
  }
  if (keyboard.pressed('d')) {
    var temp = new THREE.Vector3(MOVSPEED, 0, 0);
    camera.quaternion.multiplyVector3(temp);
    camera_position_speed = camera_position_speed.add(temp);
  }

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
  camera.setRotationFromQuaternion(quat);
  camera.position = camera.position.add(camera_position_speed);

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

      raycaster.set(camera.position, rvect.normalize());
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
    camvec = camvec.subVectors(camera.position, maxIntersect.point);
    camvec = camvec.multiplyScalar(maxIntersect.distance / SHIPSIZE + 0.1);
    camera.position = camera.position.add(camvec);
  }

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

function onDocumentMouseDown(event) {
  event.preventDefault();

  var vector = new THREE.Vector3(
    event.clientX / $('#content').width() * 2 - 1,
    -(event.clientY / $('#content').height()) * 2 + 1,
    0.5
  );
  projector.unprojectVector(vector, camera);

  var raycaster = new THREE.Raycaster();
  raycaster.set(camera.position, vector.sub(camera.position).normalize());
  var intersects = raycaster.intersectObjects(colobjects);

  if (intersects.length > 0) {
    console.log('WOO INTERSECT');
    console.log(intersects[0]);
  }
}

$(function() {
  var jsl = new THREE.JSONLoader();
  jsl.load(
    'data/XWingLow-MediumPolyByPixelOzMultiMaterialColoredVer1-0.js',
    function(model) {
      notify('Loaded model1');
      jsl.load('data/level.js', function(level) {
        notify('Loaded model2');
        init(model, level);
      });
    }
  );

  document.addEventListener('mousedown', onDocumentMouseDown, false);
});

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
    } else if (face instanceof THREE.Face4) {
      a = objMatrix.multiplyVector3(a.copy(face._vertices[face.a]));
      b = objMatrix.multiplyVector3(b.copy(face._vertices[face.b]));
      c = objMatrix.multiplyVector3(c.copy(face._vertices[face.c]));
      d = objMatrix.multiplyVector3(d.copy(face._vertices[face.d]));

      if (
        pointInFace3(intersectPoint, a, b, d) ||
        pointInFace3(intersectPoint, b, c, d)
      ) {
        intersect = {
          distance: distance,
          point: intersectPoint.clone(),
          face: face,
          faceIndex: f,
          vertices: face._vertices
        };

        intersects.push(intersect);
      }
    }
  }
  return intersects;
};
