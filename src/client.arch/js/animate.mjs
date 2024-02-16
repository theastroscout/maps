/*

Animate

*/

class Animate {

	constructor(map){
		this.map = map;
	}

	go = (el, attr, from, to, dur) => {
		let a = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
		a.setAttribute('attributeName', attr);
		a.setAttribute('begin', 'indefinite');
		a.setAttribute('repeatCount', '1');
		a.setAttribute('fill', 'freeze');
		a.setAttribute('calcMode', 'spline');
		a.setAttribute('keyTimes', '0; 0.25; 0.5; 0.75; 1');
		a.setAttribute('keySplines','0.5 0 0.5 1; 0.5 0 0.5 1; 0.5 0 0.5 1; 0.5 0 0.5 1');
		a.setAttribute('dur', dur + 's');
		a.setAttribute('from', from);
		a.setAttribute('to', to);

		this.map.svg.appendChild(a);

		a.addEventListener('endEvent', () => {
			el.setAttribute(attr, to);
			a.remove();
		});

		a.beginElement();
	}
}

export default Animate;