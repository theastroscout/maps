/*

Maps

*/

import Utils from './utils.mjs';
import Style from './style.mjs';

class Maps {
	
	constructor(customOptions){

		this.svgNS = 'http://www.w3.org/2000/svg';

		/*

		Initialise libs

		*/

		this.style = new Style(this);
		this.utils = new Utils(this);

		/*

		Options

		*/

		let options = {
			selector: '#map',
			style: 'chrome',
			coords: [-0.020853,51.50581], // [longitude, latitude]
			minZoom: 1,
			maxZoom: 24,
			zoom: 14.5
		};

		
		
		this.options = {...options, ...customOptions};

		/*

		Settings

		*/

		this.settings = {
			scaleFactor: 10000000,
			tileSize: 512
		};

		/*

		Elements

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

		Signature

		*/

		this.container.insertAdjacentHTML('beforeEnd', '<div class="c">Surfy°. <span></span></div>');
		this.copy = this.container.querySelector(':scope > .c');
		this.debug = this.container.querySelector(':scope > .c > span');

		/*

		States

		*/

		this.states = {
			ready: false,
			move: false
		};

		/*

		Helpers

		*/

		this.helpers = {};

		this.getZoomID();

		/*

		View Box

		*/

		this.viewBox = {
			center: this.utils.xy(this.options.coords, false)
		};

		/*

		Load Style, Launch Map

		*/

		this.style.get();
		this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`;
	}

	/*

	Get Zoome ID

	*/

	getZoomID = () => {
		this.zoomID = Math.min(Math.floor(this.options.zoom / 2) * 2, 14);
		this.style.render();
	}

	/*

	Window Resize

	*/

	resize = () => {
		this.width = this.container.clientWidth;
		this.height = this.container.clientHeight;
		
		this.svg.setAttribute('width', this.width);
		this.svg.setAttribute('height', this.height);

		clearTimeout(this.resize.tmo);
		this.resize.tmo = setTimeout(() => {
			this.setCenter();
			this.update();
		}, 100);
	}

	/*

	Mouse Handler

	*/

	mouseHandler = e => {

		/*
		
		Manipulate ViewBox
		https://stackoverflow.com/questions/52576376/how-to-zoom-in-on-a-complex-svg-structure

		*/

		let point;

		switch(e.type){
			case 'mousedown': case 'touchstart':

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

				this.startPoint = point;

				this.container.classList.add('move');

				document.addEventListener('mousemove', this.mouseHandler);
				document.addEventListener('mouseup', this.mouseHandler);

				document.addEventListener('touchmove', this.mouseHandler);
				document.addEventListener('touchend', this.mouseHandler);

				e.preventDefault();
				e.stopPropagation();

				break;
			
			case 'mousemove': case 'touchmove':

				/*

				Pan

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
				
				var dx = (this.startPoint.x - point.x) / this.viewBox.scale;
				var dy = (this.startPoint.y - point.y) / this.viewBox.scale;

				
				this.viewBox.x = Math.round(this.viewBox.x + dx);
				this.viewBox.y = Math.round(this.viewBox.y + dy);

				this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);

				this.options.coords = this.utils.viewBoxCenter(this.viewBox);

				this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`; 

				this.startPoint = point;

				/*

				Update Tiles

				*/

				this.update();				

				break;
			
			case 'mouseup': case 'touchend':

				/*

				End of Movement

				*/

				this.container.classList.remove('move');
				document.removeEventListener('mousemove', this.mouseHandler);
				document.removeEventListener('mouseup', this.mouseHandler);

				document.removeEventListener('touchmove', this.mouseHandler);
				document.removeEventListener('touchend', this.mouseHandler);

				break;

			case 'wheel':

				/*

				Zoom

				(!) Rewrite: From Zoom to Scale
				Change zoom first, then calculate viewBox

				*/

				this.container.classList.add('move');
				const zoomSpeed = Number.isInteger(e.deltaY) ? .05 : .15;

				var dw = this.viewBox.w * Math.sign(e.deltaY) * zoomSpeed;
				var dh = this.viewBox.h * Math.sign(e.deltaY) * zoomSpeed;
				var dx = dw * e.x / this.svg.clientWidth;
				var dy = dh * e.y / this.svg.clientHeight;
				
				this.viewBox.x = Math.round(this.viewBox.x + dx);
				this.viewBox.y = Math.round(this.viewBox.y + dy);
				this.viewBox.w = Math.round(this.viewBox.w - dw);
				this.viewBox.h = Math.round(this.viewBox.h - dh);
				this.viewBox.scale = this.svg.clientWidth / this.viewBox.w;
				this.options.zoom = this.utils.zoomFromScale(this.viewBox.scale);

				this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);

				// Debug Update
				this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`;

				clearTimeout(this.container.tmo);
				this.container.tmo = setTimeout(() => {
					this.container.classList.remove('move');
					this.getZoomID();
					this.update();
				}, 150);

				break;
		}
	}

	/*

	Update Tiles

	*/

	update = async () => {
		
		await this.tiles.get();

		if(!this.states.move){
			return false;
		}

		requestAnimationFrame(this.update);
	}

	/*

	Set Center of the Map

	*/

	setCenter = (coords,animate) => {
		const [x, y] = this.utils.xy(coords || this.options.coords);
		
		this.viewBox.scale = 0.2 * Math.pow(2, (this.options.zoom - 16));

		this.viewBox.w = Math.round(this.svg.clientWidth / this.viewBox.scale);
		this.viewBox.h = Math.round(this.svg.clientHeight / this.viewBox.scale);

		const dx = x / this.viewBox.scale;
		const dy = y / this.viewBox.scale;

		this.viewBox.x = Math.round(dx - this.viewBox.w / 2);
		this.viewBox.y = Math.round(dy - this.viewBox.h / 2);

		this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
	}

	launch = () => {
		
		/*

		Initialise Map

		*/

		if(!this.states.ready){
			this.states.ready = true;

			/*

			Resize

			*/

			window.addEventListener('resize', self.map.resize, { passive: true });
			this.resize();
			this.style.render();
		}
	}
}

export default Maps;
window.Maps = Maps;