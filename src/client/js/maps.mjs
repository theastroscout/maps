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
			tileSize: 2048,
			zoom: 14, // To compensate tile size
		};

		this.view.origin = this.utils.xy(this.options.center, false);

		// Run

		this.style.get();
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
		let zoom = this.options.zoom < 15 ? Math.floor(this.options.zoom / 2) * 2 : Math.floor(this.options.zoom);
		this.zoomID = Math.max( Math.min( zoom , 17) , 0);
		this.style.render();
	}

	/*

	Update Map

	*/

	update = () => {
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
		this.container.addEventListener('click', this.getCoords);
		this.container.addEventListener('mousedown', this.handler);
		this.container.addEventListener('touchstart', this.handler);
		this.container.addEventListener('wheel', this.handler);
		this.overlay.el.addEventListener('wheel', this.handler); // Fix scroll overlap
		this.overlay.el.addEventListener('mousedown', this.handler); // Fix scroll overlap
		this.overlay.el.addEventListener('touchstart', this.handler); // Fix scroll overlap
		window.addEventListener('resize', this.resize, { passive: true });

		this.events('init');

		this.setZoomID();
		this.resize();

		/*

		Test

		*/

		this.test();
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

				if(handler.points){
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

				document.addEventListener('mousemove', this.handler);
				document.addEventListener('mouseup', this.handler);

				document.addEventListener('touchmove', this.handler);
				document.addEventListener('touchend', this.handler);
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
					// console.log(1);
				} else {
					// console.log(handler.points.length);
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
					
					if(!handler.dist && points[1]){
						// Initial Distance between Touches
						handler.dist = Math.sqrt(Math.pow(points[0].x - points[1].x, 2) + Math.pow(points[0].y - points[1].y, 2));
					} else if(handler.points[1] && !points[1]){
						// Delete
						delete handler.dist;
					}
				}

				// Change View Position
				this.view.x += (handler.points[0].x - points[0].x) * this.view.scale;
				this.view.y += (handler.points[0].y - points[0].y) * this.view.scale;

				if(handler.dist){
					/*

					Calc Zoom Gesture

					*/

					const distance = Math.sqrt(Math.pow(points[0].x - points[1].x, 2) + Math.pow(points[0].y - points[1].y, 2));					
					this.options.zoom = Math.round((this.options.zoom + (distance - handler.dist) * .01 ) * 100) / 100;
					handler.dist = distance;
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

					document.removeEventListener('mousemove', this.handler);
					document.removeEventListener('mouseup', this.handler);

					document.removeEventListener('touchmove', this.handler);
					document.removeEventListener('touchend', this.handler);

					delete handler.points;
					delete handler.dist;

					this.events('moveend');
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

		var x = { x: this.options.center[0], y: this.options.center[1], zoom: this.options.zoom };

		var targetValue = { x: options.coords[0], y: options.coords[1], zoom: options.zoom || this.options.zoom };

		if(options.offset){
			const zero = this.utils.coords([0,0], true, true, options.zoom);
			const offset = this.utils.coords(options.offset, true, true, options.zoom);
			targetValue.x += zero[0] - offset[0];
			targetValue.y += zero[1] - offset[1];
		}

		let change = (x, target, duration) => {
			var startTime = performance.now();
			var endTime = startTime + duration;

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
				}
			}

			go();
		}

		change(x, targetValue, options.duration || 0);

	}
}

export default SurfyMaps;
window.SurfyMaps = SurfyMaps;