/*

Draw

*/

import Utils from './utils.mjs';

class Draw {

	constructor(map){
		this.map = map;
		this.utils = new Utils(map);
	}

	/*

	Line
	@Return [Created Elements, Bounding Box]

	*/

	line = feature => {
		const svgNS = 'http://www.w3.org/2000/svg';

		if(typeof feature.coords[0][0] === 'number'){
			feature.coords = [feature.coords];
		}

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		let points = [];
		for(let line of feature.coords){
			points.push('M');
			for(let i = 0, l=line.length; i < l; ++i) {
				const p = this.utils.xy([line[i][0]/1000000,line[i][1]/1000000]);
				if(i == 1){
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
		}

		const pathID = 'road'+feature.id;

		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', points.join(' '));
		path.setAttribute('id', pathID);
		if(feature.roads){
			feature.roads.defs.appendChild(path);

			const border = document.createElementNS(svgNS, 'use');
			border.setAttribute('href', '#'+pathID);
			feature.roads.layers[feature.layer].border.appendChild(border);

			const fill = document.createElementNS(svgNS, 'use');
			fill.setAttribute('href', '#'+pathID);
			feature.roads.layers[feature.layer].fill.appendChild(fill);

		} else {
			feature.container.appendChild(path);
		}
		elmts.push(path);

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

	line_origin = (id, coords, name, target) => {
		const svgNS = 'http://www.w3.org/2000/svg';

		if(typeof coords[0][0] === 'number'){
			coords = [coords];
		}

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		let points = [];
		for(let line of coords){
			points.push('M');
			for(let i = 0, l=line.length; i < l; ++i) {
				const p = this.utils.xy(line[i]);
				if(i == 1){
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
		}

		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', points.join(' '));
		path.setAttribute('id', 'road'+id);
		target.appendChild(path);
		elmts.push(path);

		if(name){
			const text = document.createElementNS(svgNS, 'text');
			const textPath = document.createElementNS(svgNS, 'textPath');
			textPath.textContent = (name + ' ').repeat(1);
			textPath.setAttribute('href', '#road'+id);
			text.appendChild(textPath);
			this.map.groups.texts.appendChild(text);

			elmts.push(text);
		}

		return {
			elmts: 	elmts,
			bounds: [minX, minY, maxX, maxY]
		};
	}

	/*

	Multi Polygon
	@Return [Created Elements, Bounding Box]

	*/

	polygon = (items, target) => {
		
		const svgNS = 'http://www.w3.org/2000/svg';

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		
		for(let polygons of items){
			let points = [];
			for(let poly of polygons){
				
				points.push('M');
				for(let i = 0, l=poly.length; i < l; ++i) {
					const p = this.utils.xy([poly[i][0]/1000000,poly[i][1]/1000000]);
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
			// path.setAttribute('stroke', 'red')
			// path.setAttribute('stroke-width', 20)
			// path.setAttribute('fill', 'black')
			path.setAttribute('d', points.join(' '));
			target.appendChild(path);
			elmts.push(path);
		}

		return {
			elmts: 	elmts,
			bounds: [minX, minY, maxX, maxY]
		};
	}

	polygon2 = (items, target) => {
		
		const svgNS = 'http://www.w3.org/2000/svg';

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		
		for(let polygons of items){
			let points = [];
			for(let poly of polygons){
				
				points.push('M');
				for(let i = 0, l=poly.length; i < l; ++i) {
					const p = this.utils.xy(poly[i]);
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
			path.setAttribute('d', points.join(' '));
			target.appendChild(path);
			elmts.push(path);
		}

		return {
			elmts: 	elmts,
			bounds: [minX, minY, maxX, maxY]
		};
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
				for(let e of feature.elmts){
					e.remove();
				}
			}

			let result;

			switch(feature.type){

				case 'LineString':
					this.line(feature);

					break;

				case 'Polygon':
					result = this.polygon([feature.coords], feature.container);
					feature.elmts = result.elmts;
					feature.bounds = result.bounds;
					break;

				case 'MultiPolygon':
					
					result = this.polygon(feature.coords, feature.container);
					feature.elmts = result.elmts;
					feature.bounds = result.bounds;

					break;
			}
		}
	}

	render2 = items => {
		console.log('Render', Object.keys(items).length);
		for(let fID in items){
			let feature = items[fID];

			feature.done = true;

			let result;

			switch(feature.type){

				case 'MultiPolygon':
					
					result = this.polygon(feature.coords, feature.container);
					feature.elmts = result.elmts;
					feature.bounds = result.bounds;

					break;
			}
		}
	}

	render_draft = () => {
		this.start = new Date();
		// this.map.svg.innerHTML = '';

		let groups = this.map.tiles.storage.sorted[this.map.zoomID];
		if(!groups){
			return true;
		}

		for(let gID in groups){
			let group = groups[gID];
			const groupTarget = this.map.groups[gID] || this.map.groups.general;

			for(let lID in group.layers){
				let layer = group.layers[lID];
				if(lID === 'landuse'){
					continue;
				}

				let layerTarget = groupTarget.layers[lID] || groupTarget;

				/*

				Draw Features

				*/

				for(let fID in layer.features){
					let feature = layer.features[fID];
					
					/*

					If element drew check if it's updated or not

					*/

					if(feature.done){
						
						if(!feature.updated){
							
							const isVisible = this.utils.isVisible(feature.bounds);

							// If is visible and hide
							if(isVisible && feature.hide){
								delete feature.hide;
								// console.log('Hide')
								for(let el of feature.elmts){
									el.style.display = '';
								}
							} else if(!isVisible && !feature.hide){
								// If is not visible and not hide
								feature.hide = true;
								for(let el of feature.elmts){
									el.style.display = 'none';
								}
							}

							// Skip Redraw
							continue;
						}

						delete feature.hide;
						delete feature.updated;

						// Remove Elements to Redraw
						if(feature.elmts){
							for(let el of feature.elmts){
								el.remove();
							}
						}
					}

					feature.done = true;

					/*

					Draw Polygon

					*/

					let result;
					switch(feature.type){
						
						case 'MultiLineString':
							let name = lID === 'trunks' ? feature.name : false;
							result = this.line(fID, feature.coords, name, layerTarget);
							feature.elmts = result.elmts;
							feature.bounds = result.bounds;

							break;

						case 'Polygon':
							console.log('Polygon');
							break;

						case 'MultiPolygon':
							
							result = this.polygon(feature.coords, layerTarget);
							feature.elmts = result.elmts;
							feature.bounds = result.bounds;

							break;
					}
				}
			}
		}

		console.log('Render time', new Date() - this.start);
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

	circle = (coords, color, radius) => {
		const [x, y] = this.utils.xy(coords);
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', x);
		circle.setAttribute('cy', y);
		circle.setAttribute('r', radius || 100);
		circle.setAttribute('fill', color || 'red');
		this.map.svg.appendChild(circle);

		return circle;
	}
}

export default Draw;