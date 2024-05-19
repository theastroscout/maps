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

	render = (url, items) => {
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

				case 'Line':
					this.line(feature);
					break;
			}
		}

		if(!this.map.states.loaded){
			this.map.firstLoad(url);
		}
	}

	/*

	Polygon

	*/

	polygon = feature => {
		let elmts = [];

		const polygons = feature.type === 'Polygon' ? [feature.coords] : feature.coords;
		
		let points = [];
		for (const poly of polygons) {
			for (const ring of poly) {
				points.push('M');
				for(let i = 0, l=ring.length; i < l; ++i) {
					const p = this.map.utils.xy(ring[i]);

					if(i == 1){
						points.push('L')
					}

					points.push(p.join(','));
				}				
				points.push('z');
			}
		}

		const path = document.createElementNS(this.map.svgNS, 'path');
		path.setAttribute('feature', feature.id)

		path.setAttribute('d', points.join(' '));
		feature.container.appendChild(path);
		elmts.push(path);

		feature.elmts = elmts;
	}

	/*

	Line

	*/

	line = feature => {
		let elmts = [];

		let points = ['M'];

		for(let i = 0, l=feature.coords.length; i < l; ++i) {
			const p = this.map.utils.xy(feature.coords[i]);
			
			if(i === 1){
				points.push('L');
			}

			points.push(p.join(','));
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
	}



	/*

	Point: Text

	*/

	point = feature => {


		const p = this.map.utils.xy(feature.coords);
		// console.log(feature.coords, p);
		const text = document.createElementNS(this.map.svgNS,'text');
		text.textContent = feature.data.name;

		if(feature.layer === 'stations'){

			const svg = document.createElementNS(this.map.svgNS, 'svg');
			svg.setAttribute('x', p[0]);
			svg.setAttribute('y', p[1]);
			// svg.style.overflow = 'visible';

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

	/*

	Draw Bounds

	*/

	bounds = (bounds, name, target) => {
		const svgNS = 'http://www.w3.org/2000/svg';
		const g = document.createElementNS(svgNS, 'g');
		g.classList.add('bounds');

		const [x1,y1] = this.map.utils.xy([bounds[0],bounds[1]]);
		const [x2,y2] = this.map.utils.xy([bounds[2],bounds[3]]);
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
			text.setAttribute('font-size', '30');
			text.setAttribute('fill', 'black');
			text.textContent = name;
			g.appendChild(text);
		}

		target.appendChild(g);

		return g;
	}
}

export default Draw;