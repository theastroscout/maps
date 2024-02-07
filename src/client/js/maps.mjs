/*

Maps

Move Tunnels to the Roads

*/

import Style from './style.mjs';
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
		this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  		this.svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
		this.svg.classList.add('container');
		this.container.append(this.svg);

		this.defs = document.createElementNS(this.svgNS, 'defs');
		this.svg.appendChild(this.defs);

		/*

		<object type="image/svg+xml" data="vector-icons.svg"></object>   
		<svg viewBox="0 0 23 23">
			<use href="vector-icons.svg#phone" ></use> 
		</svg>

		*/

		// this.groups = {};

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
		this.container.addEventListener('touchstart', this.mouseHandler);
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

		this.style = new Style(this);
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

		this.style.get();
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

		/*

		https://stackoverflow.com/questions/52576376/how-to-zoom-in-on-a-complex-svg-structure

		*/

		switch(e.type){
			case 'mousedown': case 'touchstart':
				this.startPoint = {
					x: e.x || e.touches[0].clientX,
					y: e.y || e.touches[0].clientY
				};

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
				
				var dx = (this.startPoint.x - (e.x || e.touches[0].clientX)) / this.viewBox.scale;
				var dy = (this.startPoint.y - (e.y || e.touches[0].clientY)) / this.viewBox.scale;

				
				this.viewBox.x = Math.round(this.viewBox.x + dx);
				this.viewBox.y = Math.round(this.viewBox.y + dy);

				this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);

				this.options.coords = this.utils.viewBoxCenter(this.viewBox);

				/*
				let speedFactor = 400;
				this.options.coords[0] -= (e.x - this.startPoint.x) / (TILE_SIZE * Math.pow(2, this.options.zoom)) * speedFactor;
				this.options.coords[1] += (e.y - this.startPoint.y) / (TILE_SIZE * Math.pow(2, this.options.zoom)) * speedFactor;
				this.options.coords[0] = Number(this.options.coords[0].toFixed(5));
				this.options.coords[1] = Number(this.options.coords[1].toFixed(5));
				*/

				this.debug.innerText = `${this.options.zoom}, [${this.options.coords.join(',')}]`; 

				this.startPoint = {
					x: e.x || e.touches[0].clientX,
					y: e.y || e.touches[0].clientY
				};

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

				this.style.render();

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

		/*

		Load Style

		*/

		this.style = {
			url: `/styles/${style || this.options.style}`
		};
		
		this.style.obj = document.createElement('link');
		this.style.obj.rel = 'stylesheet';
		this.style.obj.type = 'text/css';
		this.style.obj.href = this.style.url + '/style.scss';
		this.style.obj.map = this;

		this.style.obj.onload = this.parseStyle;
		document.head.appendChild(this.style.obj);

		/*
		this.style = await(await fetch(`${path}/config.json`)).json();
		console.log('Map Style', this.style)
		this._styleMap = [];
		*/

		/*

		Parse Style

		

		for(let [groupName, group] of Object.entries(this.style['groups'])){
			this._styleMap.push({
				name: groupName,
				layers: Object.keys(group.layers)
			});

			this.groups[groupName] = document.createElementNS(svgNS, 'g');
			this.groups[groupName].layers = {};
			this.groups[groupName].setAttribute('class', groupName);


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

		this.groups.texts = document.createElementNS(svgNS, 'g');
		this.groups.texts.setAttribute('class', 'texts');
		this.svg.appendChild(this.groups.texts);

		*/

		

		return true;
	}

	parseStyle(e){

		/*

		Definitions

		*/

		const defs = document.createElementNS(this.map.svgNS, 'defs');
		this.map.svg.appendChild(defs);

		const rootStyles = getComputedStyle(this.map.container);
		this.map.style.name = rootStyles.getPropertyValue('--surfy-maps-style-name').replace(/['"]+/g, '');
		this.map.style.tiles = rootStyles.getPropertyValue('--surfy-maps-tiles').replace(/['"]+/g, '');

		/*

		Collect Groups and Layers

		*/

		let groups = {};
		// console.log(this.sheet.rules.getPropertyValue('--opacity-values'))
		for(let rule of this.sheet.rules){
			let path = rule.selectorText.split('>').map(v => v.trim());
			const prefix = path.slice(0, 5).join('/')
			if(path[5] && prefix === '.SurfyMaps/svg.container/g.tiles/g.zoom/g.tile'){
				
				/*

				Group

				*/

				let group = path[5].replace('g.', '');
				
				// Create Group if not exists
				if(!groups[group]){
					groups[group] = {
						name: group,
						layers: []
					}
				}

				/*

				Layer

				*/

				if(path[6]){
					
					// Layer
					let layer = path[6].replace('g.', '');
					groups[group].layers.push(layer);

				} else {

					// Group Style
					console.log(group);
					let opacityRule = rule.style.getPropertyValue('--opacity-rule');
					if(opacityRule){
						opacityRule = opacityRule.split(',').map(v => v.trim().split(' ').map(Number))
						console.log(opacityRule);
					}
					console.log('');
					// console.log(rule.style.getPropertyValue('--fill'));
					// rule.style.setProperty('--fill', 'red');
					// console.log(rule.getPropertyValue('--opacity-values'))
				}
				
				
			}
			// console.log(path, path.slice(0, 5).join('>'))
		}

		this.map.style.groups = groups; // Object.values(groups);

		/*

		Initialise Map

		*/

		if(!this.map.states.ready){
			this.map.states.ready = true;

			/*

			Resize

			*/

			window.addEventListener('resize', this.map.resize, { passive: true });
			this.map.resize();
		}
	};

	/*

	Set Center of the Map

	*/

	setCenter = (coords,animate) => {
		const [x, y] = this.utils.xy(coords || this.options.coords);
		
		this.viewBox.scale = 0.2 * Math.pow(2, (this.options.zoom - 16));

		// $.map.options.zoom = 16;
		// $.map.setCenter();

		this.viewBox.w = Math.round(this.svg.clientWidth / this.viewBox.scale);
		this.viewBox.h = Math.round(this.svg.clientHeight / this.viewBox.scale);

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

		this.style.render();
	}
}

export default Maps;
window.Maps = Maps;