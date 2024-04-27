/*

Surfy° Maps

*/

import Utils from './utils.mjs';
import Draw from './draw.mjs';
import Tiles from './tiles.mjs';
import Marker from './marker.mjs';

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
			center: [-0.020853, 51.50581], // [longitude, latitude]
			minZoom: 1,
			maxZoom: 24,
			zoom: 18,
			events: {}
		};

		// Marge Options
		this.options = {...options, ...customOptions};

		/*

		Container

		*/

		this.root = document.querySelector(this.options.selector);
		this.root.classList.add('SurfyMaps');

		this.container = document.createElementNS(this.svgNS, 'svg');
		this.container.setAttribute('shape-rendering', 'geometricPrecision');
		this.container.setAttribute('xmlns', this.svgNS);
		this.container.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		this.container.classList.add('container');
		this.root.append(this.container);

		/*

		Overlay

		*/

		this.overlay = {
			el: document.createElement('div'),
			items: {}
		};

		this.overlay.el.classList.add('overlay');
		this.root.append(this.overlay.el);

		/*

		Custom Layers

		*/

		this.custom = {
			el: document.createElementNS(this.svgNS, 'g')
		};
		this.custom.el.classList.add('custom');
		this.container.appendChild(this.custom.el);


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
			tileSize: 2048,
			zoom: 14, // To compensate tile size
		};

		this.view.origin = this.utils.xy(this.options.center, false);

		// Run

		this.setZoomID();
		this.resize();
		this.launch();

		/*

		Test

		*/

		let center = {
			coords: this.options.center,
			name: 'Center',
			container: this.container,
			color: 'green'
		};

		this.draw.point(center);

		let axis = {
			coords: [-0.02331, 51.50501],
			name: 'Center',
			container: this.container,
			color: 'blue'
		};

		this.draw.point(axis);

		let feature = {
			coords: [-0.022323, 51.506024],
			name: 'Marker',
			container: this.container
		};
		
		this.draw.point(feature);

		delete feature.container;
		
		feature.class = 'default';
		this.addMarker(feature);
		feature.coords = [-0.022423, 51.506424];
		let marker = this.addMarker(feature);
		setTimeout(() => {
			marker.remove();
		}, 1000);

		this.addSVG({
			bbox: [-0.022221, 51.505552, -0.020372, 51.504904],
			url: 'https://sandbox.maps.surfy.one/canary-wharf.svg'
		});

		this.options.center = axis.coords;
		this.update();
	}

	/*

	Resize Map

	*/

	resize = () => {
		clearTimeout(this.resize.tmo);

		this.view.width = this.root.clientWidth;
		this.view.height = this.root.clientHeight;
		
		this.update();
	}


	setZoomID = () => {
		this.zoomID = Math.max(Math.min(Math.floor(this.options.zoom / 2) * 2, 14, 0));
	}

	/*

	Update Map

	*/

	update = () => {

		// Scale factor
		this.view.scale =  Math.pow(2, this.view.zoom  + (this.view.zoom - this.options.zoom)) / this.view.tileSize;

		const [posX, posY] = this.utils.xy(this.options.center);
		let viewBox = [
			posX - this.view.width / 2 * this.view.scale,
			posY - this.view.height / 2 * this.view.scale,
			this.view.width * this.view.scale,
			this.view.height * this.view.scale
		];
		
		this.view.x = posX;
		this.view.y = posY;

		// Update View Box
		this.container.setAttribute('viewBox', viewBox.join(' '));

		/*

		Update Overlay

		*/

		for(let id in this.overlay.items){
			let item = this.overlay.items[id];
			const [x, y] = this.utils.xy(item.coords, true, true);
			item.el.style.top = y + 'px';
			item.el.style.left = x + 'px';
		}

		// Update tiles
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
		window.addEventListener('resize', this.resize, { passive: true });
	}

	/*

	Handler

	*/

	handler = e => {

		let point;
		let handler = this.handler;
		let viewBox;

		switch(e.type){
			case 'mousedown': case 'touchstart':

				/*

				Initialise

				*/

				if(typeof e.x !== 'undefined'){
					point = {
						x: e.x,
						y: e.y
					};
				} else {
					point = {
						x: e.touches[0].clientX,
						y: e.touches[0].clientY
					};
				}

				handler.startPoint = point;

				document.addEventListener('mousemove', this.handler);
				document.addEventListener('mouseup', this.handler);

				document.addEventListener('touchmove', this.handler);
				document.addEventListener('touchend', this.handler);
				
				break;

			case 'mousemove': case 'touchmove':

				/*

				Move

				*/

				if(typeof e.x !== 'undefined'){
					point = {
						x: e.x,
						y: e.y
					};
				} else {
					point = {
						x: e.touches[0].clientX,
						y: e.touches[0].clientY
					};
				}

				// Change View Position
				this.view.x += (handler.startPoint.x - point.x) * this.view.scale;
				this.view.y += (handler.startPoint.y - point.y) * this.view.scale;

				// Update Start Point
				handler.startPoint = point;

				// Obtain new coords
				this.options.center = this.utils.coords([this.view.x, this.view.y]);

				// Update
				this.update();

				break;

			case 'mouseup': case 'touchend':

				/*

				Stop moving

				*/

				document.removeEventListener('mousemove', this.handler);
				document.removeEventListener('mouseup', this.handler);

				document.removeEventListener('touchmove', this.handler);
				document.removeEventListener('touchend', this.handler);

				delete handler.startPoint;

				break;

			case 'wheel':

				/*

				Zoom

				*/

				let zoomSpeed = Number.isInteger(e.deltaY) ? .05 : .15;
				this.options.zoom = Math.round((this.options.zoom + zoomSpeed * Math.sign(e.deltaY)) * 100) / 100;
				this.update();


			break;
		}
	}

	/*

	Add Marker

	*/

	addMarker = options => {
		return new Marker(this, options);
	}


	addSVG = async options => {
		let topLeft = this.utils.xy([options.bbox[0], options.bbox[1]]);
		let bottomRight = this.utils.xy([options.bbox[2], options.bbox[3]]);
		let svgURL = 'https://sandbox.maps.surfy.one/canary-wharf.svg';
		let src = await (await fetch(svgURL)).text();
		
		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(src, 'image/svg+xml');
		const el = svgDoc.documentElement;
		el.setAttribute('x', topLeft[0]);
		el.setAttribute('y', topLeft[1]);
		el.setAttribute('width', bottomRight[0] - topLeft[0]);
		el.setAttribute('height', bottomRight[1] - topLeft[1]);
		this.custom.el.appendChild(el);

		$(el).find('g.block').hover();

		return el;
	}
}

export default SurfyMaps;
window.SurfyMaps = SurfyMaps;