/*

Surfy° Maps

*/

import Utils from './utils.mjs';
import Style from './style.mjs';
import Draw from './draw.mjs';
import Tiles from './tiles.mjs';
import Marker from './marker.mjs';

class SurfyMaps {
	constructor(customOptions){
		this.svgNS = 'http://www.w3.org/2000/svg';
		this.endpoint = 'https://sandbox.maps.surfy.one';

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
			zoom: 15.5,
			events: {}
		};

		// Marge Options
		

		this.options = {...options, ...customOptions};

		if (customOptions.center) {
			this.options.center = [...customOptions.center];
		}

		if (customOptions.zoom) {
			this.options.zoom = parseFloat(customOptions.zoom, 10);
		}

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

		Libs

		*/

		this.utils = new Utils(this);
		this.style = new Style(this);
		this.draw = new Draw(this);
		this.tiles = new Tiles(this);

		/*

		Overlay

		*/

		this.overlay = {
			el: document.createElement('div'),
			items: {},
			groups: {}
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

		Set Up

		*/

		this.view = {
			width: this.root.clientWidth,
			height: this.root.clientHeight,
			tileSize: 2048,
			zoom: 14, // To compensate tile size
		};

		this.view.origin = this.utils.xy(this.options.center, false);
		const [posX, posY] = this.utils.xy(this.options.center);
		this.view.x = posX;
		this.view.y = posY;

		if(this.options.offset){
			const zero = this.utils.coords([0,0], true, true, this.options.zoom);
			const offset = this.utils.coords(this.options.offset, true, true, this.options.zoom);

			this.options.center[0] += zero[0] - offset[0];
			this.options.center[1] += zero[1] - offset[1];

			this.options.center = [ Math.round(this.options.center[0] * 1e6) / 1e6, Math.round(this.options.center[1] * 1e6) / 1e6 ];

			this.view.origin = this.utils.xy(this.options.center, false);
			const [posX, posY] = this.utils.xy(this.options.center);
			this.view.x = posX;
			this.view.y = posY;
		}

		// Run

		this.style.get();
	}

	/*

	Resize Map

	*/

	resize = () => {

		if(this.view.width === this.root.clientWidth && this.view.height === this.root.clientHeight){
			return true;
		}		

		this.view.width = this.root.clientWidth;
		this.view.height = this.root.clientHeight;
		
		this.update();
	}


	setZoomID = () => {
		let zoom = this.options.zoom < 15 ? Math.floor(this.options.zoom / 2) * 2 : Math.floor(this.options.zoom);
		this.zoomID = Math.max( Math.min( zoom , 17) , 0);

		this.style.render();
	}

	/*

	Update Map

	*/

	update = () => {
		if(!this.ready){
			return true;
		}
		
		this.setZoomID();

		// Scale factor
		this.view.scale =  Math.pow(2, this.view.zoom  + (this.view.zoom - this.options.zoom)) / this.view.tileSize;


		const [posX, posY] = this.utils.xy(this.options.center);
		let viewBox = [
			posX - this.view.width / 2 * this.view.scale,
			posY - this.view.height / 2 * this.view.scale,
			this.view.width * this.view.scale,
			this.view.height * this.view.scale
		];

		if(isNaN(viewBox[0])){
			console.log('SCALE!')
			console.log(this.view);
			console.log(viewBox);
			console.log(this.options);
			console.log([posX, posY]);
		}
		
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

		// this.root.addEventListener('click', this.getCoords);
		this.root.addEventListener('mousedown', this.handler);
		this.root.addEventListener('touchstart', this.handler);
		this.root.addEventListener('wheel', this.handler);
		/*
		this.overlay.el.addEventListener('wheel', this.handler); // Fix scroll overlap
		this.overlay.el.addEventListener('mousedown', this.handler); // Fix scroll overlap
		this.overlay.el.addEventListener('touchstart', this.handler); // Fix scroll overlap
		*/

		window.addEventListener('resize', this.resize, { passive: true });

		this.ready = true;

		this.events('init');

		// this.setZoomID();
		// this.resize();
		this.update();

		/*

		If Set Center was called too early

		*/

		if(this.whenReady){
			this.setCenter(this.whenReady);
			delete this.whenReady;
		}

		/*

		Test

		*/

		// this.test();
	}

	/*

	Get Coords

	*/

	getCoords = e => {
		let xy = [e.x, e.y];
		let coords = this.utils.coords(xy, true, true);
		console.log({x: e.x, y: e.y}, coords);
	}

	/*

	Handler

	*/

	handler = e => {

		let points;
		let handler = this.handler;
		let viewBox;

		switch(e.type){
			case 'mousedown': case 'touchstart':

				/*

				Initialise

				*/

				if(this.root.dataset.freeze){
					return true;
				}

				if(handler.points){
					// Catch second touch
					return true;
				}

				if(typeof e.x !== 'undefined'){
					points = [{
						x: e.x,
						y: e.y
					}];
				} else {
					points = [{
						id: e.touches[0].identifier,
						x: e.touches[0].clientX,
						y: e.touches[0].clientY
					}];
				}

				handler.points = points;
				handler.dist = points[0];
				handler.startTime = new Date();

				window.addEventListener('mousemove', this.handler);
				window.addEventListener('mouseup', this.handler);

				window.addEventListener('touchmove', this.handler);
				window.addEventListener('touchend', this.handler);

				console.log('Too fast?');
				
				e.preventDefault();

				this.events('movestart');
				
				break;

			case 'mousemove': case 'touchmove':

				/*

				Move

				*/

				if(typeof e.x !== 'undefined'){
					points = [{
						x: e.x,
						y: e.y
					}];
				} else {
					points = [{
						id: e.touches[0].identifier,
						x: e.touches[0].clientX,
						y: e.touches[0].clientY
					}];

					if(points[0].id !== handler.points[0].id){
						// Change Finger
						handler.points[0] = points[0];
					}

					if(e.touches[1]){
						// Second Touch
						points.push({
							id: e.touches[0].identifier,
							x: e.touches[1].clientX,
							y: e.touches[1].clientY
						});
					}
					
					if(!handler.zoom && points[1]){
						// Initial Distance between Touches
						handler.zoom = Math.sqrt(Math.pow(points[0].x - points[1].x, 2) + Math.pow(points[0].y - points[1].y, 2));
					} else if(handler.points[1] && !points[1]){
						// Delete
						delete handler.zoom;
					}
				}

				// Change View Position
				this.view.x += (handler.points[0].x - points[0].x) * this.view.scale;
				this.view.y += (handler.points[0].y - points[0].y) * this.view.scale;

				if(handler.zoom){
					/*

					Calc Zoom Gesture

					*/

					const zoomDistance = Math.sqrt(Math.pow(points[0].x - points[1].x, 2) + Math.pow(points[0].y - points[1].y, 2));
					this.options.zoom = Math.round((this.options.zoom + (zoomDistance - handler.zoom) * .01 ) * 100) / 100;
					handler.zoom = zoomDistance;
				}

				// Update Start Point
				handler.points = points;

				// Obtain new coords
				this.options.center = this.utils.coords([this.view.x, this.view.y]);

				// Update
				this.update();

				break;

			case 'mouseup': case 'touchend':

				/*

				Stop moving

				*/

				if(!e.touches || e.touches.length === 0){
					window.removeEventListener('mousemove', this.handler);
					window.removeEventListener('mouseup', this.handler);

					window.removeEventListener('touchmove', this.handler);
					window.removeEventListener('touchend', this.handler);

					/*

					Distance

					*/

					if(typeof e.x !== 'undefined'){
						points = {
							x: e.x,
							y: e.y
						};
					} else {
						points = {
							x: e.changedTouches[0].clientX,
							y: e.changedTouches[0].clientY
						};
					}
					handler.dist = Math.sqrt(Math.pow(handler.dist.x - points.x, 2) + Math.pow(handler.dist.y - points.y, 2));
					

					if(handler.dist > 5){
						this.events('moveend');
					}

					// Clean Assets
					delete handler.points;
					delete handler.dist;
					delete handler.zoom;

				}

				break;

			case 'wheel':

				/*

				Zoom

				*/

				let zoomSpeed = Number.isInteger(e.deltaY) ? .05 : .15;
				this.options.zoom = Math.round((this.options.zoom + zoomSpeed * Math.sign(e.deltaY)) * 100) / 100;
				this.update();
				e.preventDefault();
				e.stopPropagation();

				this.events('moveend');


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
		let svgURL = options.url;
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

	/*

	Events

	*/

	events = name => {
		if(this.options.events[name]){
			this.options.events[name]({
				zoom: this.options.zoom,
				center: this.options.center
			});
		}
	}

	/*

	Group

	*/

	removeGroup = name => {
		if(!this.overlay.groups[name]){
			return false;
		}

		for(let markerID of this.overlay.groups[name]){
			this.overlay.items[markerID].remove();
		}

		delete this.overlay.groups[name];

		return true;
	}

	/*

	To Delete

	*/

	test = () => {
		/*
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
		
		feature.class = '_default';
		this.addMarker(feature);
		feature.coords = [-0.022423, 51.506424];
		let marker = this.addMarker(feature);
		setTimeout(() => {
			marker.remove();
		}, 1000);
		*/

		this.addSVG({
			bbox: [-0.022287, 51.505448, -0.018615, 51.50462],
			url: 'https://sandbox.maps.surfy.one/styles/test/canary-wharf.svg'
		});

		// this.options.center = axis.coords;
		// this.update();
	}

	/*

	Set Center

	*/

	setCenter = options => {

		if(!this.ready){
			this.whenReady = options;
			return true;
		}

		options = structuredClone(options);

		if(!options.duration){

			if(options.offset){
				const zero = this.utils.coords([0,0], true, true, options.zoom || this.options.zoom);
				const offset = this.utils.coords(options.offset, true, true, options.zoom || this.options.zoom);

				options.coords[0] += zero[0] - offset[0];
				options.coords[1] += zero[1] - offset[1];
			}

			this.options.center = [ Math.round(options.coords[0] * 1e6) / 1e6, Math.round(options.coords[1] * 1e6) / 1e6 ];

			if(options.zoom){
				this.options.zoom = Math.round(options.zoom * 100) / 100;
			}

			this.update();
			return true;
		}

		let x = { x: this.options.center[0], y: this.options.center[1], zoom: this.options.zoom };

		let targetValue = { x: options.coords[0], y: options.coords[1], zoom: options.zoom || this.options.zoom };

		if(options.offset){
			const zero = this.utils.coords([0,0], true, true, options.zoom);
			const offset = this.utils.coords(options.offset, true, true, options.zoom);
			targetValue.x += zero[0] - offset[0];
			targetValue.y += zero[1] - offset[1];
		}

		let change = (x, target, duration) => {
			let startTime = performance.now();
			let endTime = startTime + duration;

			let ease = (t) => {
				return t * t * (3 - 2 * t);
			}

			let go = () => {
				let currentTime = performance.now();
				let progress = Math.min(1, (currentTime - startTime) / duration);
				let easedProgress = ease(progress);

				let currentValue = {
					x: x.x + (target.x - x.x) * easedProgress,
					y: x.y + (target.y - x.y) * easedProgress,
					zoom: x.zoom + (target.zoom - x.zoom) * easedProgress,
				};

				this.options.center = [ Math.round(currentValue.x * 1e6) / 1e6, Math.round(currentValue.y * 1e6) / 1e6 ];
				this.options.zoom = Math.round(currentValue.zoom * 100) / 100;
				this.update();

				// console.log("Current value: " + JSON.stringify(currentValue), Math.round(x.x + (target.x - x.x) * easedProgress));
				if (currentTime < endTime) {
					requestAnimationFrame(go);
				} else {
					this.events('moveend');
				}
			}

			go();
		}

		change(x, targetValue, options.duration);

	}

	/*

	First Load

	*/

	firstLoad = () => {
		if(!this.states.loaded){
			this.states.loaded = true;
			this.events('loaded');
		}
	}
}

export default SurfyMaps;
window.SurfyMaps = SurfyMaps;