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

	*/

	line = (id, coords, name, target) => {
		const svgNS = 'http://www.w3.org/2000/svg';

		if(typeof coords[0][0] === 'number'){
			coords = [coords];
		}

		let points = [];
		for(let line of coords){
			points.push('M');
			for(let i = 0, l=line.length; i < l; ++i) {
				const p = this.utils.xy(line[i]);
				if(i == 1){
					points.push('L')
				}
				points.push(p.join(','))
			}
			// points.push('z');
		}

		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', points.join(' '));
		path.setAttribute('id', 'road'+id);
		target.appendChild(path);

		if(name){
			const text = document.createElementNS(svgNS, 'text');
			const textPath = document.createElementNS(svgNS, 'textPath');
			textPath.textContent = (name + ' ').repeat(1);
			textPath.setAttribute('href', '#road'+id);
			text.appendChild(textPath);
			this.map.groups.texts.appendChild(text);
		}
	}

	line2 = (coords, style, layer) => {
		return;
		const svgNS = 'http://www.w3.org/2000/svg';

		let target = this.map.svg;
			target = this.map.groups.general;
		if(layer === 'buildings'){
			target = this.map.groups.buildings;
		}

		if(typeof coords[0][0] === 'number'){
			coords = [coords];
		}

		for(let line of coords){
			const polyline = document.createElementNS(svgNS, 'polyline');
			let points = [];
			points.push('M');
			for(let i = 0, l=line.length; i < l; ++i) {
				const p = this.utils.xy(line[i]);
				points.push(p.join(','))
			}
			// points.push('z')

			const path = document.createElementNS(svgNS, 'path');
			path.setAttribute('d', points.join(' '));
			target.appendChild(path);
		}
	}

	/*

	Multi Polygon
	@Return Bounding Box

	*/

	polygon = (items, target) => {
		
		const svgNS = 'http://www.w3.org/2000/svg';

		let paths = [];
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
			paths.push(path);
		}

		return {
			elmts: 	paths,
			bounds: [minX, minY, maxX, maxY]
		};
	}

	/*

	Render

	*/

	render = () => {
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
					
					if(feature.done){
						continue;
					}

					feature.done = true;

					/*

					Draw Polygon

					*/

					switch(feature.type){
						case 'MultiLineString':
							let name = lID === 'trunks' ? feature.name : false;
							this.line(fID, feature.coords, name, layerTarget);

							break;

						case 'Polygon':
							console.log('Polygon');
							break;

						case 'MultiPolygon':
							
							let result = this.polygon(feature.coords, layerTarget);
							feature.elmts = result.elmts;
							feature.bounds = result.bounds;

							break;
					}
				}
			}
		}

		console.log('Render time', new Date() - this.start);
	}
}

export default Draw;