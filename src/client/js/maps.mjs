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

		/*
		let coords = [-0.022534, 51.506535]
		let xy = this.utils.xy(coords, true, true);
		console.log(coords)
		console.log(xy)
		console.log(this.utils.coords(xy, true, true))
		*/

		// this.draw.point(feature);
		// this.overlay.items.push(feature);
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

		// [-0.020853, 51.50581]
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

	update_works = () => {
		// Update View Box
		const [posX, posY] = this.utils.xy(this.options.center);
		this.view.x = Math.round(posX - this.view.width / 2);
		this.view.y = Math.round(posY - this.view.height / 2);

		// Scale factor
		this.view.scale =  Math.pow(2, this.view.zoom  + (this.view.zoom - this.options.zoom)) / this.view.tileSize;

		// Apply scale factor to all params
		let viewBox = [this.view.x, this.view.y, this.view.width, this.view.height];
		for(let i=0,l=viewBox.length; i<l; i++){
			viewBox[i] = Math.round(viewBox[i] * this.view.scale * 100)/100;
		}

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

	update = () => {
		// Update View Box

		// Scale factor
		this.view.scale =  Math.pow(2, this.view.zoom  + (this.view.zoom - this.options.zoom)) / this.view.tileSize;

		const [posX, posY] = this.utils.xy(this.options.center);
		let viewBox = [];
		viewBox[0] = posX - this.view.width / 2 * this.view.scale;
		viewBox[1] = posY - this.view.height / 2 * this.view.scale;
		viewBox[2] = this.view.width * this.view.scale;
		viewBox[3] = this.view.height * this.view.scale;
		console.log(viewBox, this.view.scale);
		this.view.x = viewBox[0];
		this.view.y = viewBox[1];

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

		document.addEventListener('mousemove', this.test);
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
				// handler.x = this.view.xy[0];
				// handler.y = this.view.xy[1];

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
				this.view.x += handler.startPoint.x - point.x;
				this.view.y += handler.startPoint.y - point.y;

				// Update Start Point
				handler.startPoint = point;

				// Obtain new coords
				this.options.center = this.utils.coords([this.view.x + this.view.width / 2, this.view.y + this.view.height / 2]);

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

        this.s = el;
        $(el).find('g.block').hover();
	}

	test = (e) => {
		// let xy = this.utils.coords([e.x, e.y], true, true);
		// console.log(this.options.center, xy);
	}
}

export default SurfyMaps;
window.SurfyMaps = SurfyMaps;