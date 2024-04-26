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
			zoom: 14,
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
			items: []
		};

		this.overlay.el.classList.add('overlay');
		this.root.append(this.overlay.el);

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
			zoom: 14, // To compensate for tile size
			xy: [0, 0]
		};

		this.view.origin = this.utils.xy(this.options.coords, false);

		// Run

		this.setZoomID();
		this.resize(true);
		this.update();
		this.launch();

		let center = {
			coords: this.options.coords,
			name: 'Center',
			container: this.container
		};

		this.draw.point(center);

		let feature = {
			coords: [-0.022323, 51.506024],
			name: 'Marker',
			container: this.container
		};
		
		this.draw.point(feature);

		delete feature.container;

		/*
		let coords = [-0.022534, 51.506535]
		let xy = this.utils.xy(coords, true, true);
		console.log(coords)
		console.log(xy)
		console.log(this.utils.coords(xy, true, true))
		*/

		this.draw.point(feature);
		this.overlay.items.push(feature);
	}

	/*

	Resize Map

	*/

	resize = init => {
		clearTimeout(this.resize.tmo);

		this.view.width = this.root.clientWidth;
		this.view.height = this.root.clientHeight;

		if(!init){
			this.resize.tmo = setTimeout(() => {
				// Update Map
				this.update();
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

		const [posX, posY] = this.utils.xy(this.options.coords);
		this.view.x = Math.round(posX - this.view.width / 2);
		this.view.y = Math.round(posY - this.view.height / 2);

		this.view.scale =  Math.pow(2, this.view.zoom  + (this.view.zoom - this.options.zoom)) / this.view.tileSize;

		// Scale
		let viewBox = [this.view.x, this.view.y, this.view.width, this.view.height];
		for(let i=0,l=viewBox.length; i<l; i++){
			viewBox[i] = Math.round(viewBox[i] * this.view.scale * 100)/100;
		}

		this.container.setAttribute('viewBox', viewBox.join(' '));

		/*

		Overlay

		*/

		for(let item of this.overlay.items){
			const [x, y] = this.utils.xy(item.coords, true, true);
			item.el.style.top = y + 'px';
			item.el.style.left = x + 'px';
		}

		// Update
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

	handler = e => {

		let point;
		let handler = this.handler;

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
				handler.x = this.view.xy[0];
				handler.y = this.view.xy[1];

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
				
				this.view.xy[0] = handler.x + handler.startPoint.x - point.x;
				this.view.xy[1] = handler.y + handler.startPoint.y - point.y;
				this.options.coords = this.utils.coords(this.view.xy);
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

				// this.view.xy = [handler.x, handler.y];

				break;

			case 'wheel':

				/*

				Zoom

				*/

				const zoomSpeed = Number.isInteger(e.deltaY) ? .05 : .15;
				this.options.zoom = Math.round((this.options.zoom + zoomSpeed * Math.sign(e.deltaY)) * 100) / 100;

				
				console.log(this.view.xy);
				this.view.xy[0] += (e.x - this.view.width / 2) * zoomSpeed;
				this.view.xy[1] += (e.y - this.view.height / 2) * zoomSpeed;
				console.log(this.view.xy);

				
				this.options.coords = this.utils.coords(this.view.xy);

				this.update();

				break;
		}
	}
}

export default SurfyMaps;
window.SurfyMaps = SurfyMaps;