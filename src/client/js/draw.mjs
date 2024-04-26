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
		this.circle(feature.coords, feature.container);
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