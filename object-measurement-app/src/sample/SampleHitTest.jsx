import React, {useEffect, useState} from 'react';
// import PropTypes from 'prop-types';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';


const SampleHitTest = () => {

  const [alert, setAlert] = useState ('');

  const {XRWebGLLayer} = window;

  /**  Create 3d element  */
  const createThreeJsScene = () => {
    /**
     * Scene : 
     * Scenes allow you to set up what and where is to be rendered by three.js. This is where you place objects, lights and cameras.
     * 
     * Learn more -> https://threejs.org/docs/#api/en/scenes/Scene
     * 
     * Create Scene
     */
    const scene = new THREE.Scene ();

    /**
     * DirectionalLight :
     * A light that gets emitted in a specific direction. This light will behave as though it is infinitely far away and 
     * the rays produced from it are all parallel.The common use case for this is to simulate daylight; the sun is far enough away 
     * that its position can be considered to be infinite, and all light rays coming from it are parallel.
     * position : 
     * This is set equal to Object3D.DEFAULT_UP (0, 1, 0), so that the light shines from the top down.
     * 
     * Learn more -> https://threejs.org/docs/#api/en/lights/DirectionalLight
     * 
     * Create the directionalLight and add it to the scene
     */ 
    const directionalLight = new THREE.DirectionalLight (0xffffff, 0.3);
    directionalLight.position.set (10, 15, 10);
    
    /**
     * scene.add() :
     * Adds object as child of this object. An arbitrary number of objects may be added. Any current parent 
     * on an object passed in here will be removed, since an object can have at most one parent.
     * 
     * Learn more -> https://threejs.org/docs/#api/en/core/Object3D.add
     */
    scene.add (directionalLight); 
    
    return scene;
  };

  /** This allow rendered content to be viewed in real-world environment */
  const createXRSession = async(gl) => {
    // Initialize a WebXR session using "immersive-ar" and HitTest
    const session = await navigator.xr.requestSession ('immersive-ar', {'requiredFeatures':['local', 'hit-test']});
    session.updateRenderState ({
      'baseLayer':new XRWebGLLayer (session, gl)
    });

    // Request reference space as "local" to XR session
    const referenceSpace = await session.requestReferenceSpace ('local');

    // Create another XRReference that has the viewer as the origin.
    const viewerSpace = await session.requestReferenceSpace ('viewer');
    console.log (viewerSpace );
    // Perform hit testing using the viewer as origin
    const hitTestSource = await session.requestHitTestSource ({'space':viewerSpace});
    console.log (hitTestSource);
    return {session, referenceSpace, hitTestSource};
  };

  /** Activate XR to Add canvas element and initialize a webGL context that is compatible with WebXR  */
  const activateXR = async() => {
    /**
     * Canvas :
     * The HTML <canvas> element is used to draw graphics, on the fly, via JavaScript. The <canvas> element is only a container for graphics. 
     * You must use JavaScript to actually draw the graphics. Canvas has several methods for drawing paths, boxes, circles, text, and adding images.
     * 
     * Learn more -> https://www.w3schools.com/html/html5_canvas.asp
     */
    const canvas = document.createElement ('canvas');
    document.body.appendChild (canvas);

    /**
     * canvas.getContext() :
     * The HTMLCanvasElement.getContext() method returns a drawing context on the canvas, or null if the context identifier is not supported, 
     * or the canvas has already been set to a different context mode. 
     * xrCompatible : 
     * A boolean value that hints to the user agent to use a compatible graphics adapter for an immersive XR device. 
     * Setting this synchronous flag at context creation is discouraged; rather call the asynchronous WebGLRenderingContext.makeXRCompatible() method 
     * the moment you intend to start an XR session.
     * 
     * learn more -> https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
     * 
     * webgl : 
     * WebGL (Web Graphics Library) is a JavaScript API for rendering high-performance interactive 3D and 2D graphics within any compatible web browser 
     * without the use of plug-ins. WebGL does so by introducing an API that closely conforms to OpenGL ES 2.0 that can be used in HTML <canvas> elements. 
     * This conformance makes it possible for the API to take advantage of hardware graphics acceleration provided by the user's device.
     * 
     * Learn more -> https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
     */
    const gl = canvas.getContext ('webgl', {'xrCompatible':true});

    // Get a created scene
    const scene = createThreeJsScene ();

    /**
     * WebGLRenderer() :
     * The WebGL renderer displays your beautifully crafted scenes using WebGL.
     * canvas - A canvas where the renderer draws its output. This corresponds to the domElement property below. If not passed in here, 
     * a new canvas element will be created.
     * context - This can be used to attach the renderer to an existing RenderingContext. Default is null.
     * alpha - controls the default clear alpha value. When set to true, the value is 0. Otherwise it's 1. Default is false.
     * preserveDrawingBuffer - whether to preserve the buffers until manually cleared or overwritten. Default is false.
     * 
     * Learn more -> https://threejs.org/docs/#api/en/renderers/WebGLRenderer
     * 
     * Set up the WebGLRender, Which handles rendering to the session's base layer
     */
    const renderer = new THREE.WebGLRenderer ({
      'alpha':true,
      'preserveDrawingBuffer':true,
      'canvas':canvas,
      'context':gl 
    });
    /**
     * autoClear : 
     * Defines whether the renderer should automatically clear its output before rendering a frame.
     * 
     * Learn more -> https://threejs.org/docs/#api/en/renderers/WebGLRenderer.autoClear
     */
    renderer.autoClear=true;

    // Create camera and disable matrix auto update
    const camera = new THREE.PerspectiveCamera ();
    camera.matrixAutoUpdate = false;

    const {session, referenceSpace, hitTestSource} = await createXRSession (gl);

    // Load glTF (Graphics Library Transmission Format) model
    const loader = new GLTFLoader ();
    let flower, reticle;

    loader.load ('/gltf-model/reticle/reticle.gltf', function(gltf) {
      reticle = gltf.scene;
      reticle.visible = false;
      scene.add (reticle);
    });

    loader.load ('./gltf-model/korrigan-hat.gltf', (gltf) => {
      flower = gltf.scene;
    });

    session.addEventListener ('select', (event) => {
      if(flower){
        const clone = flower.clone ();
        clone.position.copy (reticle.position);
        scene.add (clone);
      }
    }, undefined, (error) => console.error (error));

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
        // console.log (view);
        const viewport = session.renderState.baseLayer.getViewport (view);
        // console.log (viewport);
        renderer.setSize (viewport.width, viewport.height);

        // Use the view's transform matrix and projection  matrix  to configure  the THREE.camera.
        camera.matrix.fromArray (view.transform.matrix);
        camera.projectionMatrix.fromArray (view.projectionMatrix);
        camera.updateMatrixWorld (true);

        // Drawing a targeting reticle
        const hitTestResults = frame.getHitTestResults (hitTestSource);
        if(hitTestResults.length > 0 && reticle){
          // console.log (hitTestResults);
          const hitPose = hitTestResults[0].getPose (referenceSpace);
          reticle.visible= true;
          reticle.position.set (hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
          reticle.updateMatrixWorld (true);
        }

        // Render the scene with THREE.WebGLRenderer.
        renderer.render (scene, camera);
      }
    };
    session.requestAnimationFrame (onXRFrame);
  };

  /** Check the device has AR support or not. */
  const isARSessionSupported = async () => {
    /**
     * navigator.xr :
     * The read-only xr property provided by the Navigator interface returns an XRSystem object which can be used to access the WebXR Device API.
     * learn more -> https://developer.mozilla.org/en-US/docs/Web/API/Navigator/xr
     * 
     * isSessionSupported() :
     * The XRSystem method isSessionSupported() returns a promise which resolves to true if the specified WebXR session mode is supported by 
     * the user's WebXR device. Otherwise, the promise resolves with false.
     * learn more -> https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported
     */
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

SampleHitTest.propTypes = {};

export default SampleHitTest;

