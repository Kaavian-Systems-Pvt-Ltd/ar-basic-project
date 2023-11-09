import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {ARButton} from 'three/examples/jsm/webxr/ARButton';
import {mergeGeometries}  from 'three/examples/jsm/utils/BufferGeometryUtils';

import './measurement.css';


const measurementsAR = () => {
  const isRender = useRef (false);

  let container, labelContainer;
  let scene, camera, light, renderer;
  let controller;
  let reticle, currentLine = null;
  let width, height; 

  let hitTestSourceRequested = false,
    hitTestSource = null;
    
  let measurements = [], labels = [];

  /**
   * Convert reticle matrix
   * @param {object} matrix 
   * @returns {object} vector3
   * 
   * This is useful when you need to work with the position component of a transformation matrix to perform operations 
   * like positioning objects in your 3D scene or calculating distances.
   */
  const matrixToVector = (matrix) => {
    let vector = new THREE.Vector3 ();
    /**
     * It extracts the translation (position) information from a 4x4 transformation matrix (usually representing the position and 
     * orientation of an object in 3D space) and sets it as the position of the Vector3 object.
     */
    vector.setFromMatrixPosition (matrix);

    return vector;
  };
  
  /**
   * To convert a 3D point from a world coordinate space into screen coordinates. 
   * @param {object} point 
   * @param {object} camera 
   * @returns {object} vector
   */
  const toScreenPosition = (point, camera) => {
    let vector = new THREE.Vector3 (); 

    vector.copy (point);

    /**
     * This method is used to project the 3D point onto the 2D screen space. 
     * This projection takes into account the camera's perspective and field of view to determine the screen position
     */
    vector.project (camera);

    // Used to convert the X-coordinate of a point from a normalized device coordinate (NDC) space to screen coordinates. 
    vector.x = (vector.x + 1) * width / 2;
    vector.y = (-vector.y + 1) * height / 2;
    vector.z = 0;

    return vector;
  };
  
  const updateLine = (matrix) => {
    let position = currentLine.geometry.attributes.position.array;

    position[3] = matrix.elements[12];
    position[4] = matrix.elements[13]; 
    position[5] = matrix.elements[14];

    // This is important because it tells Three.js that the attribute values have changed and should be synchronized with the GPU for rendering.
    currentLine.geometry.attributes.position.needsUpdate = true;
    // This line recalculates the bounding sphere for the line's geometry.
    currentLine.geometry.computeBoundingSphere ();
  };

  /**
   * Init line
   * @param {object} point 
   * @returns line
   */
  const initLine = (point) => {
    let lineMaterial = new THREE.LineBasicMaterial ({
      'color':0xF9B572,
      'linewidth':8,
      'linecap':'round'
    });

    let lineGeometry = new THREE.BufferGeometry ().setFromPoints ([point, point]);
    return new THREE.Line (lineGeometry, lineMaterial);
  }; 

  /**
   * Create label DOM container
   */
  const initLabelContainer = () => {
    labelContainer = document.createElement ('div');
    labelContainer.style.position = 'absolute';
    labelContainer.style.top = '0px';
    labelContainer.style.pointerEvents = 'none';
    labelContainer.setAttribute ('id', 'container');
  };

  /**
   * Create reticle shape
   */
  const initReticle = () => {
    // PI/2 radians = 90 degree
    let ring = new THREE.RingGeometry (0.045, 0.05, 32).rotateX (- Math.PI / 2);
    let dot = new THREE.CircleGeometry (0.005, 32).rotateX (- Math.PI / 2);
    // A mesh is an object that combines geometry (shape) and material (appearance) to define how an object appears in a 3D scene.
    reticle = new THREE.Mesh (
      // Merging two geometries (ring , dot) together to create the combined geometry for the reticle
      mergeGeometries ([ring, dot]),
      // creates a simple material that does not respond to lighting or shadows and typically uses a single color for the mesh.
      new THREE.MeshBasicMaterial ()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
  };

  /**
   * Init Webgl renderer to setup render pixel ratio, size and enable XR (AR, VR, MR) experience true.
   */
  const initWebGLRender = () => {
    renderer = new THREE.WebGLRenderer ({'antialias':true, 'alpha':true});
    /**
     * This is a common practice to ensure that your rendered graphics are properly scaled to match the device's pixel density 
     * and to achieve sharper and more detailed graphics on such displays.
     */
    renderer.setPixelRatio (window.devicePixelRatio);
    renderer.setSize (window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.domElement.style.display = 'none';
  };

  const onWindowResize = () => {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix ();

    renderer.setSize ( window.innerWidth, window.innerHeight );
  };

  /**
   * This callback function for controller select event
   */
  const onSelect = () => {
    // If hit-test session is started and reticle visible, then measure real world object.
    if(reticle.visible){
      // Convert reticle matrix position into vector and push it into measurements array
      measurements.push (matrixToVector (reticle.matrix));
    
      /**
       * To find distance need two points vectors.
       * If measurements length is equal to 2 calculate distance, else init line from first reticle vector
       */
      if(measurements.length === 2) {
        // Find distance from first vector point to second vector point
        const distance = Math.round (measurements[0].distanceTo (measurements[1]) * 100);
         
        // Create div to display to display measurement
        let text = document.createElement ('div');
        text.style.color = 'rgb(255,255,255)';
        text.textContent = `${distance} cm`;
        document.getElementById ('container').appendChild (text);
    
        // Find center point between two vector points to position label
        let line = new THREE.Line3 (...measurements);
        let center = new THREE.Vector3 ();
        let point = line.at (0.5, center);
        
        text.style.top = `${point.y}px`;
        text.style.left = `${point.x}px`;

        // Store labels DOM element and points to renderer
        labels.push ({'div':text, 'point':point});

        // After calculating a distance reset measurements array and line
        measurements= [];
        currentLine = null;
      }else{
        // Start line from reticle selected points
        currentLine = initLine (measurements[0]);
        scene.add (currentLine);
      }
    }
  };

  const render = (time, frame) => {
    if(frame){
      //  This method is used to retrieve the current reference space, which represents the coordinate system in which your AR or VR experiences are anchored.
      let referenceSpace = renderer.xr.getReferenceSpace ();
      //  This method is used to retrieve the current XR session, which represents the context in which your AR or VR experience is running.
      let session = renderer.xr.getSession ();

      if(!hitTestSourceRequested){
        /**
         * This method is used to request a specific type of reference space. In this case, 'viewer' is specified, which typically represents 
         * the coordinate system associated with the user's viewpoint.
         */
        session.requestReferenceSpace ('viewer').then ((referenceSpace) => {
          /**
           * This method is used to request a hit test source. It takes an object as its argument with a property named 'space' that should be set to a reference space 
           * (typically obtained using session.requestReferenceSpace()).
           */
          session.requestHitTestSource ({'space':referenceSpace}).then ((source) => {
            hitTestSource = source;
          });
        });

        session.addEventListener ('end', () => {
          hitTestSource = null;
          hitTestSourceRequested = false;
          isRender.current = false;
        });

        hitTestSourceRequested = true;
      }

      /**
       * If hitTestSource available, then get hit test results and visible reticle, update reticle matrix by hit pose matrix
       */
      if(hitTestSource){
        let hitTestResults = frame.getHitTestResults (hitTestSource);
        
        if(hitTestResults.length){
          let hit = hitTestResults[0];
          reticle.visible = true;
          reticle.matrix.fromArray (hit.getPose (referenceSpace).transform.matrix);
        }else{
          reticle.visible = false;
        }

        if(currentLine){
          updateLine (reticle.matrix);
        }
      }

      // Render measurement labels
      labels.map ((label) => {
        // To convert a 3D point from a world coordinate space into screen coordinates. 
        let pos = toScreenPosition (label.point, renderer.xr.getCamera (camera));
        let x = pos.x;
        let y = pos.y;

        label.div.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) `;
      });

      /**
       * This is a method provided by the renderer to perform the rendering.
       * scene: This should be a reference to the Three.js scene that contains all the 3D objects you want to render. 
       *        The scene represents the virtual environment.
       * camera: This should be a reference to the Three.js camera that defines the viewpoint from which the scene is rendered. 
       *         The camera specifies the position, orientation, and perspective of the view.
       */
      renderer.render (scene, camera);
    }else{
      labelContainer.style.display='none';
    }
  };

  /**
   * Init XR
   */
  const initXR = () => {
    isRender.current = true;
    container = document.getElementById ('webgl');
    
    width = window.innerWidth;
    height = window.innerHeight;

    /**
     * Step 1 : Create scene to display element
     */
    scene = new THREE.Scene ();

    /**
     * Setup camera and light for display 3D elements
     */
    camera = new THREE.PerspectiveCamera (70, width/height, 0.01, 20);
    light = new THREE.HemisphereLight (0xffffff, 0xbbbbff, 1);
    light.position.set (0.5, 1, 0.25);
    scene.add (light);
    
    /**
     * Step 2: Init Webgl render and create Canvas to create interface for AR elements
     * Then append it to the our DOM element
     */
    initWebGLRender ();
    container.appendChild (renderer.domElement);

    /**
     * Step 3 : Create DOM label container to display Metrics on the screen
     */
    initLabelContainer ();
    container.appendChild (labelContainer);

    /**
     * Step 4 : Create AR button
     * This request XR session to device. If it's available enable XR mode, else Disable this button.
     * 
     * The 'dom-overlay' feature is often used to render a 2D DOM (HTML) overlay on top of the AR scene. 
     * This overlay can be used to display UI elements, information, or interactive components.
     * 
     * Hit testing is a fundamental AR feature that allows the system to detect real-world surfaces and objects 
     * so that virtual content can be placed or interact with the real world correctly.
     */
    const arButton = ARButton.createButton (renderer, {
      'optionalFeatures':['dom-overlay', 'dom-overlay-for-handheld-ar'],
      'domOverlay':{'root':document.getElementById ('container')},
      'requiredFeatures':['hit-test']
    });
    document.body.appendChild (arButton);

    /**
     * Step 5 : Setup controller
     * This line gets a controller object for the specified index (in this case, index 0) from the renderer's XR system. In WebXR applications, 
     * these controllers are used to represent physical input devices, such as VR controllers or motion controllers.
     */
    controller = renderer.xr.getController (0);
    /**
     * It listens for the 'select' event, which is typically triggered when the user interacts with the controller, such as pressing a button or triggering an action. 
     * When the 'select' event occurs, it will call the onSelect function.
     */
    controller.addEventListener ('select', onSelect );
    scene.add (controller);

    /**
     * Step 6 : Init Reticle, it's help to identifies the surface of the real world
     */
    initReticle ();
    scene.add (reticle);

    window.addEventListener ('resize', onWindowResize);

    /**
     *  This renderer method used to continuously render frames and update 3D scene
     */
    renderer.setAnimationLoop (render);
  };

  useEffect (() => {
    /**
     * Step 0: Init WebXR
     */  
    if(!isRender.current){
      initXR ();
    }
  }, []);
  return (
    <div id='webgl'>
    </div>
  );
};

measurementsAR.propTypes = {};

export default measurementsAR;
