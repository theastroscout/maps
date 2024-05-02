/*

Draw

*/

class Draw {

	constructor(map){
		this.map = map;
		this.total = 0;
	}

	/*

	Point

	*/

	point = feature => {
		this.circle(feature.coords, feature.container, feature.color);
	}

	/*

	Draw Circle

	*/

	circle = (coords, container, color='red', radius) => {
		const [x, y] = this.map.utils.xy(coords);
		const circle = document.createElementNS(this.map.svgNS, 'circle');
		circle.setAttribute('cx', x);
		circle.setAttribute('cy', y);
		circle.setAttribute('r', radius || 3);
		circle.setAttribute('fill', color);
		(container || this.map.container).appendChild(circle);
		container.appendChild(circle);

		return circle;
	}

	/*

	Render

	*/

	render = items => {
		const amount = Object.keys(items).length;
		this.total += amount;
		// console.log(`@Render Objects current: ${amount}, ${this.total} in total.`);

		for(let fID in items){
			let feature = items[fID];

			switch(feature.type){

				case 'Point':
					this.point(feature);
					break;

				case 'Polygon': case 'MultiPolygon':
					this.polygon(feature);
					break;

				case 'LineString':
					this.line(feature);
					break;
			}
		}
		
	}

	/*

	Polygon

	*/

	polygon = feature => {

		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		let coords = feature.type === 'Polygon' ? [feature.coords] : feature.coords;


		
		let points = [];

		for(let poly of coords){
			
			points.push('M');
			for(let i = 0, l=poly.length; i < l; ++i) {
				const p = this.map.utils.xy([poly[i][0]/1000000,poly[i][1]/1000000]);

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

		const path = document.createElementNS(this.map.svgNS, 'path');
		path.setAttribute('feature', feature.id)

		path.setAttribute('d', points.join(' '));
		feature.container.appendChild(path);
		elmts.push(path);

		feature.elmts = elmts;
		feature.bounds = [minX, minY, maxX, maxY];
	}

	/*

	Line

	*/

	line = feature => {
		let elmts = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		let points = ['M'];

		for(let i = 0, l=feature.coords.length; i < l; ++i) {
			const coords = feature.coords[i];
			const p = this.map.utils.xy([coords[0]/1000000,coords[1]/1000000]);
			
			if(i === 1){
				points.push('L');
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

		const path = document.createElementNS(this.map.svgNS, 'path');
		path.setAttribute('d', points.join(' '));

		if(feature.group === 'roads'){

			/*

			Roads

			*/

			const pathID = 'r' + feature.id + '-' + feature.tileURL;
			path.setAttribute('id', pathID);

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

			/*

			Railways and Paths

			*/

			feature.container.appendChild(path);
			elmts.push(path);
		}

		feature.elmts = elmts;
		feature.bounds = [minX, minY, maxX, maxY];
	}



	/*

	Point: Text

	*/

	point = feature => {
		const p = this.map.utils.xy([feature.coords[0]/1000000,feature.coords[1]/1000000]);
		const text = document.createElementNS(this.map.svgNS,'text');
		text.textContent = feature.data.name;

		if(feature.layer === 'stations'){
			const svg = document.createElementNS(this.map.svgNS, 'svg');
			svg.setAttribute('x', p[0]);
			svg.setAttribute('y', p[1]);
			svg.style.overflow = 'visible';

			svg.appendChild(text);

			const icon = document.createElementNS(this.map.svgNS, 'image');
			icon.setAttribute('href', this.map.style.sprites+'#'+feature.data.network.icon);
			svg.appendChild(icon);

			feature.container.appendChild(svg);
		} else {
			text.setAttribute('x', p[0]);
			text.setAttribute('y', p[1]);
			
			feature.container.appendChild(text);
			feature.elmts = text;
		}
	}
}

export default Draw;