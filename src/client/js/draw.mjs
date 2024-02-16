/*

Draw

*/

class Draw {

	constructor(map){
		this.map = map;
	}

	/*

	Draw Bounds

	*/

	bounds = (bounds, name, target) => {
		const g = document.createElementNS(this.map.svgNS, 'g');
		g.classList.add('bounds');

		const [x1,y1] = this.map.utils.xy([bounds[0],bounds[1]]);
		const [x2,y2] = this.map.utils.xy([bounds[2],bounds[3]]);
		const width = x2 - x1;
		const height = y2 - y1;
		const rect = document.createElementNS(this.map.svgNS, 'rect');
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
			const text = document.createElementNS(this.map.svgNS,'text');
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

	Render

	*/

	render = () => {
		
	}

}

export default Draw;