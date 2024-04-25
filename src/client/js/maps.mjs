/*

Surfy° Maps

*/

import Utils from './utils.mjs';
import Draw from './draw.mjs';
import Tiles from './tiles.mjs';

class SurfyMaps {
	constructor(customOptions){
		this.svgNS = 'http://www.w3.org/2000/svg';

		/*

		States

		*/

		this.states = {
			move: false
		};

		/*

		Options

		*/

		const options = {
			selector: '#map',
			style: 'chrome',
			coords: [-0.020853, 51.50581], // [longitude, latitude]
			minZoom: 1,
			maxZoom: 24,
			zoom: 14.5,
			events: {},
			tileSize: 1024
		};

		// Marge Options
		this.options = {...options, ...customOptions};

		/*

		Container

		*/

		this.container = document.querySelector(this.options.selector);
		this.container.classList.add('SurfyMaps');

		this.svg = document.createElementNS(this.svgNS, 'svg');
		this.svg.setAttribute('shape-rendering', 'geometricPrecision');
		this.svg.setAttribute('xmlns', this.svgNS);
  		this.svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		this.svg.classList.add('container');
		this.container.append(this.svg);

		/*

		Custom Layer

		*/

		this.customLayer = document.createElement('div');
		this.customLayer.classList.add('custom');
		this.container.append(this.customLayer);

		/*

		Libs

		*/

		this.utils = new Utils(this);
		this.draw = new Draw(this);
		this.tiles = new Tiles(this);

		/*

		Set Up

		*/

		this.view = {
			origin: this.utils.xy(this.options.coords, false)
		};

		let feature = {
			coords: [-0.022323, 51.506024],
			name: 'Marker'
		};
		
		this.draw.point(feature);

		// Run

		this.setZoomID();
		this.resize();
		this.update(true);
		this.launch();
	}

	/*

	Resize Map

	*/

	resize = init => {
		clearTimeout(this.resize.tmo);

		this.option.width = this.container.clientWidth;
		this.option.height = this.container.clientHeight;

		if(!init){
			this.resize.tmo = setTimeout(() => {
				// Update Map
			}, 300);
		}
	}


	setZoomID = () => {
		this.zoomID = Math.max(Math.min(Math.floor(this.options.zoom / 2) * 2, 14, 0));
	}

	/*

	Update Map

	*/

	update = () => {

		this.tiles.update();

		if(!this.states.move){
			return false;
		}

		requestAnimationFrame(this.update);
	}

	/*

	Launch the map

	*/

	launch = () => {
		this.container.addEventListener('mousedown', this.handler);
		this.container.addEventListener('touchstart', this.handler);
		this.container.addEventListener('wheel', this.handler);
	}

	/*

	Handler

	*/

	handler(e){
		switch(e.type){
			case 'mousedown': case 'touchstart':

				/*

				Initialise

				*/
				
				break;

			case 'mousemove': case 'touchmove':

				/*

				Move

				*/

				break;

			case 'mouseup': case 'touchend':

				/*

				Stop moving

				*/

				break;

			case 'wheel':

				/*

				Zoom

				*/

				break;
		}
	}
}

export default SurfyMaps;
window.SurfyMaps = SurfyMaps;