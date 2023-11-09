import React from 'react';

import * as THREE from 'three';
import {CSS2DObject, CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer';
const Line = () => {
  const renderer = new THREE.WebGLRenderer ();
  renderer.setSize ( window.innerWidth, window.innerHeight );
  document.body.appendChild ( renderer.domElement );

  const labelRenderer = new CSS2DRenderer ();
  labelRenderer.setSize (window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  document.body.appendChild (labelRenderer.domElement);
    
  const camera = new THREE.PerspectiveCamera ( 45, window.innerWidth / window.innerHeight, 1, 500 );
  camera.position.set ( 0, 0, 100 );
  camera.lookAt ( 0, 0, 0 );
    
  const scene = new THREE.Scene ();

  // create a blue LineBasicMaterial
  const material = new THREE.LineBasicMaterial ( {  
    'color':0xF9B572,
    'linewidth':8,
    'linecap':'round'
  } );

  const points = [];
  //   points.push ( new THREE.Vector3 ( - 10, 0, 0 ) );
  points.push ( new THREE.Vector3 ( -10, 0, 0 ) );
  points.push ( new THREE.Vector3 ( 10, 0, 0 ) );

  const geometry = new THREE.BufferGeometry ().setFromPoints ( points );

  const line = new THREE.Line ( geometry, material );

  const lineDiv = document.createElement ('div');
  lineDiv.textContent = '3cm';
  lineDiv.style.marginTop ='-1rem';
  lineDiv.style.color = 'white';

  let lineLabel = new CSS2DObject (lineDiv);
  lineLabel.position.set (0, -2.8, 0);

  line.add (lineLabel);
  scene.add ( line );

  //   requestAnimationFrame (animate);
  renderer.render ( scene, camera );
  labelRenderer.render (scene, camera);

  //   useEffect (() => {
  //     animate ();
  //   }, []);
    
  return (
    <div id='container'> 
    </div>
  );
};

export default Line;