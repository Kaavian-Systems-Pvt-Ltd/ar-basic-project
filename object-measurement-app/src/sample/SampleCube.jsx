import React, {useEffect, useState} from 'react';
// import PropTypes from 'prop-types';
import * as THREE from 'three';


const SampleCube = () => {

  const [alert, setAlert] = useState ('');

  const {XRWebGLLayer} = window;

  /**  Create 3d element  */
  const createThreeJsScene = () => {
    // Create Scene
    const scene = new THREE.Scene ();

    // The cube will have different color each side.
    const material = [
      new THREE.MeshBasicMaterial ({'color':0xff0000}),
      new THREE.MeshBasicMaterial ({'color':0x0000ff}),
      new THREE.MeshBasicMaterial ({'color':0x00ff00}),
      new THREE.MeshBasicMaterial ({'color':0xff00ff}),
      new THREE.MeshBasicMaterial ({'color':0x00ffff}),
      new THREE.MeshBasicMaterial ({'color':0xffff00})
    ];

    // Create the cube and add it to the scene
    const cube = new THREE.Mesh (new THREE.BoxGeometry (0.2, 0.2, 0.2), material);
    cube.position.set (1, 1, 1);
    scene.add (cube); 
    
    return scene;
  };

  /** This allow rendered content to be viewed in real-world environment */
  const createXRSession = async(gl) => {
    // Initialize a WebXR session using "immersive-ar"
    const session = await navigator.xr.requestSession ('immersive-ar');
    session.updateRenderState ({
      'baseLayer':new XRWebGLLayer (session, gl)
    });

    // Request reference space as "local" to XR session
    const referenceSpace = await session.requestReferenceSpace ('local');

    return {session, referenceSpace};
  };

  /** Activate XR to Add canvas element and initialize a webGL context that is compatible with WebXR  */
  const activateXR = async() => {
    const canvas = document.createElement ('canvas');
    document.body.appendChild (canvas);
    const gl = canvas.getContext ('webgl', {'xrCompatible':true});

    // Get a created scene
    const scene = createThreeJsScene ();

    // Set up the WebGLRender, Which handles rendering to the session's base layer
    const renderer = new THREE.WebGLRenderer ({
      'alpha':true,
      'preserveDrawingBuffer':true,
      'canvas':canvas,
      'context':gl 
    });
    renderer.autoClear=true;

    // Create camera and disable matrix auto update
    const camera = new THREE.PerspectiveCamera ();
    camera.matrixAutoUpdate = false;

    const {session, referenceSpace} = await createXRSession (gl);

    // Create a render loop that allows us to draw on the AR view
    const onXRFrame = (time, frame) => {
      // Queue up the next draw request
      session.requestAnimationFrame (onXRFrame);

      // Bind the graphics framebuffer to the baseLayer's framebuffer
      gl.bindFramebuffer (gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);

      // Retrieve the pose of the device
      // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
      const pose = frame.getViewerPose (referenceSpace);
      if(pose){
        // In mobile AR, we only have one view.
        const view = pose.views[0];

        const viewport = session.renderState.baseLayer.getViewport (view);
        renderer.setSize (viewport.width, viewport.height);

        // Use the view's transform matrix and projection  matrix  to configure  the THREE.camera.
        camera.matrix.fromArray (view.transform.matrix);
        camera.projectionMatrix.fromArray (view.projectionMatrix);
        camera.updateMatrixWorld (true);

        // Render the scene with THREE.WebGLRenderer.
        renderer.render (scene, camera);

      }
    };
    session.requestAnimationFrame (onXRFrame);
  };

  /** Check the device has AR support or not. */
  const isARSessionSupported = async () => {
    const isArSessionSupported = navigator.xr && navigator.xr.isSessionSupported && await navigator.xr.isSessionSupported ('immersive-ar');
    if(isArSessionSupported) document.getElementById ('enter-ar').addEventListener ('click', activateXR); 
    else setAlert ('AR Session is not Supported');
  };
  
  // Init
  useEffect (() => {
    isARSessionSupported ();
  }, []);

  return (
    <div>
      <h1>{alert}</h1>
      <button id='enter-ar'>Start AR</button>
    </div>
  );
};

SampleCube.propTypes = {};

export default SampleCube;