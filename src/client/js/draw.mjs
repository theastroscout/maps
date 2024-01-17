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

	line = (id, coords, name, target) => {
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

	rect = (bounds, name) => {
		const svgNS = 'http://www.w3.org/2000/svg';
		const [x,y] = this.utils.xy([bounds[0],bounds[1]]);
		const rect = document.createElementNS(svgNS, 'rect');
		rect.setAttribute('x', x);
		rect.setAttribute('y', y);
		rect.setAttribute('width', '10000');
		rect.setAttribute('height', '10000');
		rect.setAttribute('stroke', 'black');
		rect.setAttribute('strokeWidth', '10px');
		rect.setAttribute('vector-effect', 'non-scaling-stroke');
		rect.setAttribute('fill', 'none');

		this.map.svg.appendChild(rect);

		if(name){
			const text = document.createElementNS(svgNS,'text');
			text.setAttribute('x', x+300);
			text.setAttribute('y', y+300);
			text.setAttribute('font-size', '300');
			text.setAttribute('fill', 'black');
			text.textContent = name;
			this.map.svg.append(text);
		}
	}

	/*

	Draw Circle

	*/

	circle = coords => {
		const [x, y] = this.utils.xy(coords);
		const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		circle.setAttribute("cx", x);
		circle.setAttribute("cy", y);
		circle.setAttribute("r", "100");
		circle.setAttribute("fill", "red");
		this.map.svg.appendChild(circle);
	}
}

export default Draw;