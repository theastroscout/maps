/*

Draw

*/

import Utils from './utils.mjs';

class Draw {

	constructor(map){
		this.map = map;
		this.utils = new Utils(map);
	}

	text = feature => {
		const p = this.utils.xy([feature.coords[0]/1000000,feature.coords[1]/1000000]);
		const text = document.createElementNS(this.map.svgNS,'text');
		text.textContent = feature.name;

		if(feature.group === 'stations'){
			const networks = [
				{
					name: 'Default',
					icon: 'default'
				},
				{
					name: 'London Underground',
					icon: 'tfl-lu'
				},
				{
					name: 'London Overground',
					icon: 'tfl-lo'
				},
				{
					name: 'Elizabeth Line',
					icon: 'tfl-el'
				},
				{
					name: 'Docklands Light Railway',
					icon: 'tfl-dlr'
				},
				{
					name: 'National Rail',
					icon: 'uk-nr'
				}
			];

			// console.log(feature.data)
			const svg = document.createElementNS(this.map.svgNS, 'svg');
			svg.setAttribute('x', p[0]);
			svg.setAttribute('y', p[1]);
			svg.style.overflow = 'visible';

			// text.setAttribute('x', 10);
			// text.setAttribute('y', 0);
			svg.appendChild(text);

			const icon = document.createElementNS(this.map.svgNS, 'image');
			icon.setAttribute('href', this.map.style.sprites+'#'+networks[feature.data].icon);
			svg.appendChild(icon);

			feature.container.appendChild(svg);
		} else {
			text.setAttribute('x', p[0]);
			text.setAttribute('y', p[1]);
			
			feature.container.appendChild(text);
			feature.elmts = text;
		}
	}

	/*

	Line
	@Return [Created Elements, Bounding Box]

	*/

	line = feature => {

		let coords = [...feature.coords];
		if(typeof coords[0][0] === 'number'){
			coords = [coords];
		}

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		
		// console.log(feature.id, feature.coords[0][0], coords)

		let points = [];
		for(let line of coords){
			points.push('M');
			for(let i = 0, l=line.length; i < l; ++i) {
				const p = this.utils.xy([line[i][0]/1000000,line[i][1]/1000000]);
				
				if(i === 0){
					
				} else if(i === 1){
					points.push('L')
				}
				points.push(p.join(','))

				/*

				Bounds

				*/

				minX = Math.min(minX, p[0]);
				minY = Math.min(minY, p[1]);
				maxX = Math.max(maxX, p[0]);
				maxY = Math.max(maxY, p[1]);
			}
			// points.push('Z');
		}

		

		const path = document.createElementNS(this.map.svgNS, 'path');
		// console.log(feature)
		path.setAttribute('d', points.join(' '));
		// path.setAttribute('id', feature.id);
		if(feature.group === 'roads'){
			const pathID = 'r'+feature.id;
			path.setAttribute('id', pathID);

			/*
			feature.roads.defs.appendChild(path);

			const border = document.createElementNS(svgNS, 'use');
			border.setAttribute('href', '#'+pathID);
			feature.roads.layers[feature.layer].border.appendChild(border);

			const fill = document.createElementNS(svgNS, 'use');
			fill.setAttribute('href', '#'+pathID);
			feature.roads.layers[feature.layer].fill.appendChild(fill);
			*/
			// console.log(feature.container)

			feature.container.defs.appendChild(path);
			elmts.push(path);

			if(feature.container.border){
				const border = document.createElementNS(this.map.svgNS, 'use');
				border.setAttribute('href', '#'+pathID);
				feature.container.border.appendChild(border);
				elmts.push(border);
			}

			const fill = document.createElementNS(this.map.svgNS, 'use');
			fill.setAttribute('href', '#'+pathID);
			feature.container.fill.appendChild(fill);			
			elmts.push(fill);

		} else {
			// console.log(feature, path)
			feature.container.appendChild(path);
			elmts.push(path);
		}

		/*
		if(name){
			const text = document.createElementNS(svgNS, 'text');
			const textPath = document.createElementNS(svgNS, 'textPath');
			textPath.textContent = (name + ' ').repeat(1);
			textPath.setAttribute('href', '#road'+id);
			text.appendChild(textPath);
			this.map.groups.texts.appendChild(text);

			elmts.push(text);
		}
		*/

		feature.elmts = elmts;
		feature.bounds = [minX, minY, maxX, maxY];
	}

	/*

	Multi Polygon
	@Return [Created Elements, Bounding Box]

	*/

	polygon = feature => {
		
		const svgNS = 'http://www.w3.org/2000/svg';

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		let coords = feature.type === 'Polygon' ? [feature.coords] : feature.coords;
		
		for(let polygons of coords){
			let points = [];
			for(let poly of polygons){
				
				points.push('M');
				for(let i = 0, l=poly.length; i < l; ++i) {
					const p = this.utils.xy([poly[i][0]/1000000,poly[i][1]/1000000]);
					
					// this.circle([poly[i][0]/1000000,poly[i][1]/1000000], 'black', 2, feature.container);

					if(i == 1){
						points.push('L')
					}
					points.push(p.join(','));

					/*

					Bounds

					*/

					minX = Math.min(minX, p[0]);
					minY = Math.min(minY, p[1]);
					maxX = Math.max(maxX, p[0]);
					maxY = Math.max(maxY, p[1]);
				}

				points.push('z');
				
			}

			const path = document.createElementNS(svgNS, 'path');
			path.setAttribute('feature', feature.id)
			// path.setAttribute('stroke-width', 20)
			if(feature.id === 104004922){
				path.setAttribute('fill', 'red')
			}
			path.setAttribute('d', points.join(' '));
			feature.container.appendChild(path);
			elmts.push(path);
		}

		feature.elmts = elmts;
		feature.bounds = [minX, minY, maxX, maxY];
	}

	/*

	Render

	*/

	render = items => {
		console.log('Render', Object.keys(items).length);

		for(let fID in items){
			let feature = items[fID];

			/*

			Redraw

			*/

			if(feature.elmts){
				if(feature.group === 'landuse'){
					// console.log('Remove',feature.group)
					// console.log(feature)
				}

				try {
					for(let e of feature.elmts){
						e.remove();
					}
				} catch(e){
					console.log(e)
					console.log(feature)
				}

				delete feature.elmts;
			}

			switch(feature.type){

				case 'Point':
					this.text(feature);
					break;

				case 'MultiLineString':
					this.line(feature);

					break;

				case 'LineString':
					this.line(feature);

					break;

				case 'Polygon':
					this.polygon(feature);
					break;

				case 'MultiPolygon':
					this.polygon(feature);
					break;
			}
		}
	}

	/*

	Draw Rectangle

	*/

	rect = (bounds, name, target) => {
		const svgNS = 'http://www.w3.org/2000/svg';
		const g = document.createElementNS(svgNS, 'g');

		const [x1,y1] = this.utils.xy([bounds[0],bounds[1]]);
		const [x2,y2] = this.utils.xy([bounds[2],bounds[3]]);
		const width = x2 - x1;
		const height = y2 - y1;
		const rect = document.createElementNS(svgNS, 'rect');
		rect.setAttribute('x', x1);
		rect.setAttribute('y', y1);
		rect.setAttribute('width', width);
		rect.setAttribute('height', height);
		rect.setAttribute('stroke', 'black');
		rect.setAttribute('strokeWidth', '10px');
		rect.setAttribute('vector-effect', 'non-scaling-stroke');
		rect.setAttribute('fill', 'none');

		g.appendChild(rect);
		

		if(name){
			const text = document.createElementNS(svgNS,'text');
			text.setAttribute('x', x1 + width * .05);
			text.setAttribute('y', y1 + width * .05);
			text.setAttribute('font-size', '300');
			text.setAttribute('fill', 'black');
			text.textContent = name;
			g.appendChild(text);
		}

		target = target || this.map.svg;
		target.appendChild(g);

		return g;
	}

	/*

	Draw Bounds

	*/

	bounds = (bounds, name, target) => {
		const svgNS = 'http://www.w3.org/2000/svg';
		const g = document.createElementNS(svgNS, 'g');
		g.classList.add('bounds');

		const [x1,y1] = this.utils.xy([bounds[0],bounds[1]]);
		const [x2,y2] = this.utils.xy([bounds[2],bounds[3]]);
		const width = x2 - x1;
		const height = y2 - y1;
		const rect = document.createElementNS(svgNS, 'rect');
		rect.setAttribute('x', x1);
		rect.setAttribute('y', y1);
		rect.setAttribute('width', width);
		rect.setAttribute('height', height);
		rect.setAttribute('stroke', 'red');
		rect.setAttribute('strokeWidth', '20px');
		rect.setAttribute('vector-effect', 'non-scaling-stroke');
		rect.setAttribute('fill', 'none');

		g.appendChild(rect);
		
		if(name){
			const text = document.createElementNS(svgNS,'text');
			text.setAttribute('x', x1 + width * .05);
			text.setAttribute('y', y1 + width * .05);
			text.setAttribute('font-size', '300');
			text.setAttribute('fill', 'black');
			text.textContent = name;
			g.appendChild(text);
		}

		target = target || this.map.svg;
		target.appendChild(g);

		return g;
	}

	/*

	Draw Circle

	*/

	circle = (coords, color, radius, container) => {
		const [x, y] = this.utils.xy(coords);
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', x);
		circle.setAttribute('cy', y);
		circle.setAttribute('r', radius || 100);
		circle.setAttribute('fill', color || 'red');
		(container || this.map.svg).appendChild(circle);

		return circle;
	}
}

export default Draw;