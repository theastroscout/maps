/*

Draw

*/

class Draw {

	constructor(map){
		this.map = map;
	}

	/*

	Point

	*/

	point = feature => {
		if(feature.container){
			this.circle(feature.coords, feature.container);
		} else {
			const div = document.createElement('div');
			div.classList.add('m');
			div.classList.add(feature.class || 'default');
			// div.innerText = 'Marker';
			const [x, y] = this.map.utils.xy(feature.coords, true, true);
			div.style.top = y + 'px';
			div.style.left = x + 'px';
			this.map.customLayer.appendChild(div);
			feature.el = div;
		}
	}

	/*

	Draw Circle

	*/

	circle = (coords, container, color, radius) => {
		const [x, y] = this.map.utils.xy(coords);
		const circle = document.createElementNS(this.map.svgNS, 'circle');
		circle.setAttribute('cx', x);
		circle.setAttribute('cy', y);
		circle.setAttribute('r', radius || 3);
		circle.setAttribute('fill', color || 'red');
		(container || this.map.container).appendChild(circle);
		container.appendChild(circle);

		return circle;
	}
}

export default Draw;