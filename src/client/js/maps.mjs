/*

Maps

*/

import Tiles from './tiles.mjs';
import Utils from './utils.mjs';
import Draw from './draw.mjs';
import Animate from './animate.mjs';

const RE = 6378137; // Earth Radius
const EPSILON = 1e-14;
const LL_EPSILON = 1e-11;
const CE = 2 * Math.PI * RE; // Circumference of the Earth
const TILE_SIZE = 512;

class Maps {
	
	constructor(customOptions){

		this.svgNS = 'http://www.w3.org/2000/svg';

		/*

		Options

		*/

		let options = {
			selector: '#map',
			style: 'chrome',
			coords: [-0.026704,51.505599], // [longitude, latitude]
			minZoom: 1,
			maxZoom: 24,
			zoom: 14
		};

		
		
		this.options = {...options, ...customOptions};

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

		this.width = this.container.clientWidth;
		this.height = this.container.clientHeight;

		// this.container.insertAdjacentHTML('beforeEnd', '<svg></svg>');
		// this.svg = this.container.querySelector(':scope > svg');

		this.svg = document.createElementNS(this.svgNS, 'svg');
		this.svg.setAttribute('shape-rendering', 'geometricPrecision');
		this.container.append(this.svg);

		this.groups = {};

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

		this.helpers = {
		};

		this.getZoomID();

		/*

		Handlers

		*/

		this.container.addEventListener('mousedown', this.mouseHandler);
		this.container.addEventListener('wheel', this.mouseHandler);

		// this.setCenter();

		/*
		this.draw.circle(this.options.coords);

		let coords = this.utils.viewBoxCenter(this.viewBox);
		this.circle = this.draw.circle(coords, 'blue', 200);

		coords = this.utils.leftTopCircle(this.viewBox);
		console.log('Left Top', coords)
		this.leftTopCircle = this.draw.circle(coords, 'green', 200);

		coords = this.utils.rightBottomCircle(this.viewBox);
		console.log('Right Bottom', coords)
		this.rightBottomCircle = this.draw.circle(coords, 'purple', 200);
		*/


		// this.draw.circle([-0.02197265625, 0.3326416015625], 'black', 200);

		/*

		Initialise utils

		*/

		this.utils = new Utils(this);
		this.tiles = new Tiles(this);
		this.draw = new Draw(this);
		this.animate = new Animate(this);

		/*

		View Box

		*/

		this.viewBox = {
			center: this.utils.xy(this.options.coords, false)
		};

		/*

		Load Style, Launch Map

		*/

		this.getStyle();
		this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`;
	}

	/*

	Get Zoome ID

	*/

	getZoomID = () => {
		this.zoomID = Math.min(Math.floor(this.options.zoom / 2) * 2, 14);
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

		// https://stackoverflow.com/questions/52576376/how-to-zoom-in-on-a-complex-svg-structure

		switch(e.type){
			case 'mousedown':
				this.startPoint = {
					x: e.x,
					y: e.y
				};

				this.container.classList.add('move');

				document.addEventListener('mousemove', this.mouseHandler);
				document.addEventListener('mouseup', this.mouseHandler);

				break;
			
			case 'mousemove':

				/*

				Pan

				*/
				
				var dx = (this.startPoint.x - e.x) / this.viewBox.scale;
				var dy = (this.startPoint.y - e.y) / this.viewBox.scale;
				
				this.viewBox.x = Math.round(this.viewBox.x + dx);
				this.viewBox.y = Math.round(this.viewBox.y + dy);

				this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);

				this.options.coords = this.utils.viewBoxCenter(this.viewBox);

				/*
				let [x,y] = this.utils.xy(this.options.coords);
				this.circle.setAttribute('cx', x);
				this.circle.setAttribute('cy', y);

				let coords = this.utils.leftTopCircle(this.viewBox);
				let [a,b] = this.utils.xy(coords);
				this.leftTopCircle.setAttribute('cx', a);
				this.leftTopCircle.setAttribute('cy', b);

				coords = this.utils.rightBottomCircle(this.viewBox);
				[a,b] = this.utils.xy(coords);
				this.rightBottomCircle.setAttribute('cx', a);
				this.rightBottomCircle.setAttribute('cy', b);
				*/


				/*
				let speedFactor = 400;
				this.options.coords[0] -= (e.x - this.startPoint.x) / (TILE_SIZE * Math.pow(2, this.options.zoom)) * speedFactor;
				this.options.coords[1] += (e.y - this.startPoint.y) / (TILE_SIZE * Math.pow(2, this.options.zoom)) * speedFactor;
				this.options.coords[0] = Number(this.options.coords[0].toFixed(5));
				this.options.coords[1] = Number(this.options.coords[1].toFixed(5));
				*/

				this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`; 

				this.startPoint = {
					x: e.x,
					y: e.y
				};

				// clearTimeout(this.container.tmo);
				// this.container.tmo = setTimeout(() => {
					this.update();
				// }, 0);

				break;
			
			case 'mouseup':

				/*

				End of Movement

				*/

				this.container.classList.remove('move');
				document.removeEventListener('mousemove', this.mouseHandler);
				document.removeEventListener('mouseup', this.mouseHandler);

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
		console.log('Map Style', this.style)
		this._styleMap = [];

		/*

		Parse Style

		*/

		for(let [groupName, group] of Object.entries(this.style['groups'])){
			this._styleMap.push({
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

		/*

		Initialise Map

		*/

		if(!this.states.ready){
			this.states.ready = true;

			/*

			Resize

			*/

			window.addEventListener('resize', this.resize, { passive: true });
			this.resize();

			// this.tiles.get();
		}

		return true;
	}

	setCenter = (coords,animate) => {
		const [x, y] = this.utils.xy(coords || this.options.coords);
		
		this.viewBox.scale = 0.2 * Math.pow(2, (this.options.zoom - 16));

		// $.map.options.zoom = 16;
		// $.map.setCenter();

		this.viewBox.w = this.svg.clientWidth / this.viewBox.scale;
		this.viewBox.h = this.svg.clientHeight / this.viewBox.scale;

		const dx = x / this.viewBox.scale;
		const dy = y / this.viewBox.scale;
		// this.viewBox.x = Math.round(dx - this.viewBox.w / 2);
		// this.viewBox.y = Math.round(dy - this.viewBox.h / 2);

		this.viewBox.x = Math.round(dx - this.viewBox.w / 2);
		this.viewBox.y = Math.round(dy - this.viewBox.h / 2);

		if(animate){
			// this.svg.appendChild(`<animate attributeName="viewBox" to="${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}" dur="5s" fill="freeze" />`)
			
			// animateElement.setAttribute('keySplines', '0.165 0.84 0.44 1');
			/*
			this.zoomAnimation.setAttribute('from', this.svg.getAttribute('viewBox'));
			this.zoomAnimation.setAttribute('to', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
			this.zoomAnimation.beginElement();
			*/
			
			this.animate.go(
				this.svg,
				'viewBox',
				this.svg.getAttribute('viewBox'),
				`${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`,
				1.5
			);
		} else {
			this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
		}
	}
}

export default Maps;
window.Maps = Maps;