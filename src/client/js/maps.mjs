/*

Maps

*/

import Tiles from './tiles.mjs';
import Utils from './utils.mjs';
import Draw from './draw.mjs';

const RE = 6378137; // Earth Radius
const EPSILON = 1e-14;
const LL_EPSILON = 1e-11;
const CE = 2 * Math.PI * RE; // Circumference of the Earth
const TILE_SIZE = 512;

class Maps {
	
	constructor(customOptions){

		this.utils = new Utils(this);
		this.tiles = new Tiles(this);
		this.draw = new Draw(this);

		/*

		Options

		*/

		let options = {
			selector: '#map',
			style: 'chrome',
			coords: [-0.026704,51.505599], // [longitude, latitude]
			minZoom: 1,
			maxZoom: 24,
			zoom: 16
		};

		
		
		this.options = {...options, ...customOptions};
		this.center = this.utils.xyCenter(this.options.coords);

		/*

		Settings

		*/

		this.settings = {
			scaleFactor: 10000000, // window.devicePixelRatio,
			// scaleFactor: 10000000, // window.devicePixelRatio,
			tileSize: 512
		};

		/*

		Elements

		*/

		this.container = document.querySelector(this.options.selector);
		this.container.classList.add('SurfyMaps');

		this.container.insertAdjacentHTML('beforeEnd', '<svg></svg>');
		this.svg = this.container.querySelector(':scope > svg');
		this.svg.setAttribute('shape-rendering', 'geometricPrecision');

		this.groups = {};
		
		this.svg.setAttribute('width', window.innerWidth);
		this.svg.setAttribute('height', window.innerHeight);


		this.width = this.svg.clientWidth;
		this.height = this.svg.clientHeight;
		this.position = {
			x: 0,
			y: 0
		};

		this.viewBox = {
			// x: this.svg.clientWidth / -2,
			// y: this.svg.clientHeight / -2,
			// w: this.svg.clientWidth,
			// h: this.svg.clientHeight,
			// bounds: []
		};

		// this.svg.setAttribute('viewBox', Object.values(this.viewBox).join(' '));

		/*

		Zoom Animation

		*/

		this.zoomAnimation = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
		this.zoomAnimation.setAttribute('attributeName', 'viewBox');
		this.zoomAnimation.setAttribute('begin', 'indefinite');
		this.zoomAnimation.setAttribute('repeatCount', '1');
		this.zoomAnimation.setAttribute('fill', 'freeze');
		this.zoomAnimation.setAttribute('calcMode', 'spline');
		this.zoomAnimation.setAttribute('keyTimes', '0; 0.25; 0.5; 0.75; 1');
		this.zoomAnimation.setAttribute('keySplines','0.5 0 0.5 1; 0.5 0 0.5 1; 0.5 0 0.5 1; 0.5 0 0.5 1');
		this.zoomAnimation.setAttribute('dur', '1.5s');
		this.svg.appendChild(this.zoomAnimation);
		this.zoomAnimation.addEventListener('endEvent', () => {				
			this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
		});
		

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
			ready: false
		};

		/*

		Helpers

		*/

		this.helpers = {
		};

		/*

		Resize

		*/

		window.addEventListener('resize', this.resize, { passive: true });
		this.resize();

		this.getZoomID();

		/*

		Handlers

		*/

		this.container.addEventListener('mousedown', this.mouseHandler);
		this.container.addEventListener('wheel', this.mouseHandler);

		this.setCenter();

		this.getStyle();
		this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`;
	}

	getZoomID = () => {
		this.zoomID = Math.min(Math.floor(this.options.zoom / 2) * 2, 14);
	}

	/*

	Window Resize

	*/

	resize = () => {
		this.width = this.container.clientWidth;
		this.height = this.container.clientHeight;
	}

	/*

	Mouse Handler

	*/

	mouseHandler = e => {

		// https://stackoverflow.com/questions/52576376/how-to-zoom-in-on-a-complex-svg-structure

		switch(e.type){
			case 'mousedown':
				this.startPoint = {
					x: e.x,
					y: e.y
				};

				this.container.classList.add('move');

				this.container.addEventListener('mousemove', this.mouseHandler);
				this.container.addEventListener('mouseup', this.mouseHandler);

				break;
			
			case 'mousemove':
				
				var dx = (this.startPoint.x - e.x) / this.viewBox.scale;
				var dy = (this.startPoint.y - e.y) / this.viewBox.scale;
				
				dx = Math.round(this.viewBox.x + dx);
				dy = Math.round(this.viewBox.y + dy);

				this.svg.setAttribute('viewBox', `${dx} ${dy} ${this.viewBox.w} ${this.viewBox.h}`);
				break;
			
			case 'mouseup':

				/*

				Pan

				*/

				this.container.classList.remove('move');
				this.container.removeEventListener('mousemove', this.mouseHandler);
				this.container.removeEventListener('mouseup', this.mouseHandler);

				var dx = (this.startPoint.x - e.x) / this.viewBox.scale;
				var dy = (this.startPoint.y - e.y) / this.viewBox.scale;
				this.viewBox.x = Math.round(this.viewBox.x + dx);
				this.viewBox.y = Math.round(this.viewBox.y + dy);

				console.log(this.viewBox)

				break;

			case 'wheel':

				/*

				Zoom

				*/

				this.container.classList.add('move');
				const zoomSpeed = Number.isInteger(e.deltaY) ? .08 : .15;

				var dw = this.viewBox.w * Math.sign(e.deltaY) * zoomSpeed;
				var dh = this.viewBox.h * Math.sign(e.deltaY) * zoomSpeed;
				var dx = dw * e.x / this.svg.clientWidth;
				var dy = dh * e.y / this.svg.clientHeight;
				
				this.viewBox.x = Math.round(this.viewBox.x + dx);
				this.viewBox.y = Math.round(this.viewBox.y + dy);
				this.viewBox.w = Math.round(this.viewBox.w - dw);
				this.viewBox.h = Math.round(this.viewBox.h - dh);
				this.viewBox.scale = this.svg.clientWidth / this.viewBox.w;

				this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);

				clearTimeout(this.container.tmo);
				this.container.tmo = setTimeout(() => {
					this.container.classList.remove('move');
				}, 150);

				break;
		}
	}

	/*

	Get Style

	*/

	getStyle = async style => {
		const svgNS = 'http://www.w3.org/2000/svg';

		/*

		Definitions

		*/

		const defs = document.createElementNS(svgNS, 'defs');
		this.svg.appendChild(defs);

		/*

		Load Style

		*/

		const path = `/styles/${style || this.options.style}`;

		let link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = path + '/style.scss';
		document.head.appendChild(link);

		this.style = await(await fetch(`${path}/config.json`)).json();
		console.log(this.style)
		this.styleMap = [];

		/*

		Parse Style

		*/

		for(let [groupName, group] of Object.entries(this.style['groups'])){
			this.styleMap.push({
				name: groupName,
				layers: Object.keys(group.layers)
			});

			this.groups[groupName] = document.createElementNS(svgNS, 'g');
			this.groups[groupName].layers = {};
			this.groups[groupName].setAttribute('class', groupName);

			/*

			Create Layers

			*/

			for(let layer in group.layers){
				let layerItem = group.layers[layer];
				if(layerItem.def){
					const useBorder = document.createElementNS(svgNS, 'use');
					useBorder.setAttribute('href', `#${layer}`);
					useBorder.setAttribute('class', `${layer}Border`);
					this.groups[groupName].appendChild(useBorder);

					const useBody = document.createElementNS(svgNS, 'use');
					useBody.setAttribute('href', `#${layer}`);
					useBody.setAttribute('class', `${layer}`);
					this.groups[groupName].appendChild(useBody);

					// Ref
					this.groups[groupName].layers[layer] = document.createElementNS(svgNS, 'g');
					this.groups[groupName].layers[layer].setAttribute('id', layer);
					defs.appendChild(this.groups[groupName].layers[layer]);
				} else {
					this.groups[groupName].layers[layer] = document.createElementNS(svgNS, 'g');
					this.groups[groupName].layers[layer].setAttribute('class', layer);
					this.groups[groupName].appendChild(this.groups[groupName].layers[layer]);
				}
			}

			this.svg.appendChild(this.groups[groupName]);			
		}

		this.groups.general = document.createElementNS(svgNS, 'g');
		this.groups.general.layers = {};
		this.groups.general.setAttribute('class', 'general');
		this.svg.appendChild(this.groups.general);

		/*

		Text

		*/

		this.groups.texts = document.createElementNS(svgNS, 'g');
		this.groups.texts.setAttribute('class', 'texts');
		this.svg.appendChild(this.groups.texts);


		if(!this.states.ready){
			this.states.ready = true;
			this.tiles.get();
		}

		return true;
	}

	setCenter = (coords,animate) => {
		const [x, y] = this.utils.xy(coords || this.options.coords);
		
		this.viewBox.scale = 0.2 * Math.pow(2, (this.options.zoom - 16));

		console.log('Set Center', this.viewBox);
		// $.map.options.zoom = 16;
		// $.map.setCenter();

		this.viewBox.w = this.svg.clientWidth / this.viewBox.scale;
		this.viewBox.h = this.svg.clientHeight / this.viewBox.scale;

		const dx = x / this.viewBox.scale;
		const dy = y / this.viewBox.scale;
		this.viewBox.x = Math.round(dx - this.viewBox.w / 2);
		this.viewBox.y = Math.round(dy - this.viewBox.h / 2);

		if(animate){
			// this.svg.appendChild(`<animate attributeName="viewBox" to="${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}" dur="5s" fill="freeze" />`)
			
			// animateElement.setAttribute('keySplines', '0.165 0.84 0.44 1');
			this.zoomAnimation.setAttribute('from', this.svg.getAttribute('viewBox'));
			this.zoomAnimation.setAttribute('to', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
			this.zoomAnimation.beginElement();
		} else {
			this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
		}
	}
}

export default Maps;
window.Maps = Maps;