
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Configurer, ConfigurerHelper } from './Configurer.js';


// Correct negative blenshapes shader of ThreeJS
THREE.ShaderChunk[ 'morphnormal_vertex' ] = "#ifdef USE_MORPHNORMALS\n	objectNormal *= morphTargetBaseInfluence;\n	#ifdef MORPHTARGETS_TEXTURE\n		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n	    objectNormal += getMorph( gl_VertexID, i, 1, 2 ) * morphTargetInfluences[ i ];\n		}\n	#else\n		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];\n		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];\n		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];\n		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];\n	#endif\n#endif";
THREE.ShaderChunk[ 'morphtarget_pars_vertex' ] = "#ifdef USE_MORPHTARGETS\n	uniform float morphTargetBaseInfluence;\n	#ifdef MORPHTARGETS_TEXTURE\n		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n		uniform sampler2DArray morphTargetsTexture;\n		uniform vec2 morphTargetsTextureSize;\n		vec3 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset, const in int stride ) {\n			float texelIndex = float( vertexIndex * stride + offset );\n			float y = floor( texelIndex / morphTargetsTextureSize.x );\n			float x = texelIndex - y * morphTargetsTextureSize.x;\n			vec3 morphUV = vec3( ( x + 0.5 ) / morphTargetsTextureSize.x, y / morphTargetsTextureSize.y, morphTargetIndex );\n			return texture( morphTargetsTexture, morphUV ).xyz;\n		}\n	#else\n		#ifndef USE_MORPHNORMALS\n			uniform float morphTargetInfluences[ 8 ];\n		#else\n			uniform float morphTargetInfluences[ 4 ];\n		#endif\n	#endif\n#endif";
THREE.ShaderChunk[ 'morphtarget_vertex' ] = "#ifdef USE_MORPHTARGETS\n	transformed *= morphTargetBaseInfluence;\n	#ifdef MORPHTARGETS_TEXTURE\n		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n			#ifndef USE_MORPHNORMALS\n				transformed += getMorph( gl_VertexID, i, 0, 1 ) * morphTargetInfluences[ i ];\n			#else\n				transformed += getMorph( gl_VertexID, i, 0, 2 ) * morphTargetInfluences[ i ];\n			#endif\n		}\n	#else\n		transformed += morphTarget0 * morphTargetInfluences[ 0 ];\n		transformed += morphTarget1 * morphTargetInfluences[ 1 ];\n		transformed += morphTarget2 * morphTargetInfluences[ 2 ];\n		transformed += morphTarget3 * morphTargetInfluences[ 3 ];\n		#ifndef USE_MORPHNORMALS\n			transformed += morphTarget4 * morphTargetInfluences[ 4 ];\n			transformed += morphTarget5 * morphTargetInfluences[ 5 ];\n			transformed += morphTarget6 * morphTargetInfluences[ 6 ];\n			transformed += morphTarget7 * morphTargetInfluences[ 7 ];\n		#endif\n	#endif\n#endif";

class App {

    constructor() {
        
        this.fps = 0;
        this.elapsedTime = 0; // clock is ok but might need more time control to dinamicaly change signing speed
        this.clock = new THREE.Clock();
        this.signingSpeed = 1;
        this.loaderGLB = new GLTFLoader();
        
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        
        this.model1 = null;
        this.modelVisible = null;

        this.configurer = null;
        this.configurerHelper = null;
    }

    init() {
            

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xa0a0a0 );
        // const gridHelper = new THREE.GridHelper( 10, 10 );
        // gridHelper.position.set(0,0.001,0);
        // this.scene.add( gridHelper );
                        
        // renderer
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaInput = true; // applies degamma to textures ( not applied to material.color and roughness, metalnes, etc. Only to colour textures )
        this.renderer.gammaOutput = true; // applies gamma after all lighting operations ( which are done in linear space )
        this.renderer.shadowMap.enabled = false;
        document.body.appendChild( this.renderer.domElement );

        // camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.01, 1000);
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.object.position.set(0.0, 1.5, 1);
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 7;
        this.controls.target.set(0.0, 1.3, 0);
        this.controls.update();
        
        // IBL Light
        // var that = this;

        // new RGBELoader()
        //     .setPath( 'data/hdrs/' )
        //     .load( 'cafe.hdr', function ( texture ) {

        //         texture.mapping = THREE.EquirectangularReflectionMapping;

        //         // that.scene.background = texture;
        //         that.scene.environment = texture;

        //         that.renderer.render( that.scene, that.camera );
        // } );

        // include lights
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.2 );
        this.scene.add( hemiLight );

        let keySpotlight = new THREE.SpotLight( 0xffffff, 0.4, 0, 45 * (Math.PI/180), 0.5, 1 );
        keySpotlight.position.set( 0.5, 2, 2 );
        keySpotlight.target.position.set( 0, 1, 0 );
        this.scene.add( keySpotlight.target );
        this.scene.add( keySpotlight );

        let fillSpotlight = new THREE.SpotLight( 0xffffff, 0.2, 0, 45 * (Math.PI/180), 0.5, 1 );
        fillSpotlight.position.set( -0.5, 2, 1.5 );
        fillSpotlight.target.position.set( 0, 1, 0 );
        // fillSpotlight.castShadow = true;
        this.scene.add( fillSpotlight.target );
        this.scene.add( fillSpotlight );

        let dirLight = new THREE.DirectionalLight( 0xffffff, 0.2 );
        dirLight.position.set( 1.5, 5, 2 );
        this.scene.add( dirLight );

        // add entities
        let ground = new THREE.Mesh( new THREE.PlaneGeometry( 300, 300 ), new THREE.MeshStandardMaterial( { color: 0x141414, depthWrite: true, roughness: 1, metalness: 0 } ) );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add( ground );
        
        let backPlane = new THREE.Mesh( new THREE.PlaneGeometry( 7, 9 ), new THREE.MeshStandardMaterial( {color: 0x141455, side: THREE.DoubleSide, roughness: 1, metalness: 0 } ) );
        backPlane.name = 'Chroma';
        backPlane.position.z = -1;
        backPlane.receiveShadow = true;
        this.scene.add( backPlane );

        // so the screen is not black while loading
        this.renderer.render( this.scene, this.camera );
        
        let filePath = './EvaLowTexturesV2Decimated.glb';  let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), -Math.PI/2 );
        // let filePath = './camila_test.glb';  let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), 0 );
        // let filePath = './merged_scaledglb.glb';  let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), 0 );
        // let filePath = './kevin_finished_first_test_7.glb';  let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), 0 );
        // let filePath = './Eva_Y.glb';  let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), 0 );
        // let filePath = './kevinRigBlender.glb'; let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), 0 );
        this.loaderGLB.load( filePath , (glb) => {
            let model = this.modelVisible = glb.scene;
            let skeleton = null;
            model.traverse( (object) => {
                if ( object.isMesh || object.isSkinnedMesh ) {
                    if ( object.isSkinnedMesh ){ skeleton = object.skeleton; }
                    object.material.side = THREE.DoubleSide; //needed for raycaster
                    object.frustumCulled = false;
                    object.castShadow = true;
                    object.receiveShadow = true;
                    if(object.material.map) 
                        object.material.map.anisotropy = 16;
                } 
                if (object.isBone) {
                    object.scale.set(1.0, 1.0, 1.0);
                }else{
                    object.scale.set(1.0, 1.0, 1.0);
                    object.quaternion.set(0,0,0,1);
                    object.position.set(0,0,0);
                }
            } );
            this.skeletonVisible = skeleton;
            model.position.set( 1,0,0 );
            model.quaternion.premultiply( modelRotation );
            model.castShadow = true;

            this.scene.add(model);
            // this.scene.add( new THREE.SkeletonHelper( model ) );

            skeleton.pose();
        })

        this.loaderGLB.load( filePath , (glb) => {
            let model = this.model1 = glb.scene;
            this.modelFileName = filePath.slice( filePath.lastIndexOf( "/" ) + 1 );
            model.traverse( (object) => {
                if ( object.isMesh || object.isSkinnedMesh ) {
                    if ( object.isSkinnedMesh ){ this.skeleton = object.skeleton;  object.isMesh = true; object.isSkinnedMesh = false; }
                    object.frustumCulled = false;
                    object.castShadow = true;
                    object.receiveShadow = true;
                    if( object.material ){
                        object.material = new THREE.MeshBasicMaterial( { color: 0xdddddd } );
                        object.material.side = THREE.DoubleSide; //needed for raycaster
                    }
                    if(object.material.map) 
                        object.material.map.anisotropy = 16;
                } 
                if (object.isBone) {
                    object.scale.set(1.0, 1.0, 1.0);
                }else{
                    object.scale.set(1.0, 1.0, 1.0);
                    object.quaternion.set(0,0,0,1);
                }
            } );
            model.position.set( 1,0,0 );
            model.quaternion.premultiply( modelRotation );
            model.castShadow = true;
            model.visible = false;

            this.scene.add(model);
            let skeletonhelper = new THREE.SkeletonHelper( this.skeleton.bones[0] ); 
            skeletonhelper.frustumCulled = false;
            this.scene.add( skeletonhelper );

            this.skeleton.pose();
            this.configurer = new Configurer( this.skeleton, this.model1, this.scene );
            this.configurerHelper = new ConfigurerHelper( this.configurer, this.camera, this.renderer.domElement );
            this.configurerHelper.transformControls.addEventListener( "dragging-changed", (e)=>{ this.controls.enabled = !e.value; } );

            window.addEventListener( "pointermove", (e)=>{
                this.configurerHelper.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
                this.configurerHelper.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
            });
            window.addEventListener( "keyup", (e)=>{
                switch( e.which ){
                    case 27: // escape
                        if ( this.configurerHelper.getMode() == ConfigurerHelper._E_MODES.EDIT ){ this.configurerHelper.cancelEdit(); } 
                        break;
                    case 49: // 1
                        this.configurerHelper.setEditMode( 0 ); 
                        break;
                    case 50: // 2
                        this.configurerHelper.setEditMode( 1 );
                        break;
                    case 51: // 3
                        this.configurerHelper.setEditMode( 2 );
                        break;
                    case 70: // f
                        this.configurerHelper.toggleFreezeEdit( 2 );

                    case 69: // e
                    {   // export
                        let configurerJSON = this.configurer.exportJSON();
                        configurerJSON._comments = "All points are in mesh space (no matrices of any kind are applied)"
                        configurerJSON.fingerAxes._comments = "Axes in mesh space. Quats = quats from where axes where computed (tpose). Thumb has a correction Thumb quat = qCorrection * qBind";
                        let json = { _comments: this.modelFileName, bodyController: configurerJSON };

                        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent( JSON.stringify( json , (key,value)=>{
                            if ( value.isQuaternion ){ return { x:value.x, y:value.y, z:value.z, w:value.w } }
                            else if ( typeof( value ) == "number" ){ return Number( value.toFixed(6) ); }
                            else{ return value; }
                        } ) );
                        let downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", "config.json" );
                        document.body.appendChild(downloadAnchorNode); // required for firefox
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                        break;
                    }

                    case 72: // h
                        this.configurerHelper.toggleVisibility( );
                    default: break;
                }
            });
            window.addEventListener( "mouseup", (e)=>{
                if ( e.shiftKey ){
                    if ( this.configurerHelper.getMode() == ConfigurerHelper._E_MODES.HOVER ){
                        this.configurerHelper.selectToEditFromHover();
                    } 
                }
                else if ( e.altKey ){
                    if ( this.configurerHelper.getMode() == ConfigurerHelper._E_MODES.EDIT ){
                        this.configurerHelper.commitEdit();
                    }
                }
            });
            this.animate();
            $('#loading').fadeOut(); //hide();
        });
       

        

        window.addEventListener( 'resize', this.onWindowResize.bind(this) );

    }

    animate() {

        if ( !window.fps ){ window.fps = 10; }
        setTimeout( this.animate.bind(this), 1000/window.fps );
        // requestAnimationFrame( this.animate.bind(this) );

        let delta = this.clock.getDelta() 
        this.fps = Math.floor( 1.0 / ((delta>0)?delta:1000000) );
        
        delta *= this.signingSpeed;
        this.elapsedTime += delta;

        
        this.configurerHelper.update();

        this.renderer.render( this.scene, this.camera );

    }
    
    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

}


let app = new App();
app.init();
window.global = {app:app};
export { app };
