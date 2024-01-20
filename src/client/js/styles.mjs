/*

Styles

*/

class Style {

	constructor(map){
		this.map = map;
		this.rules = [];
	}

	/*

	Get Style

	*/

	get = style => {

		this.style = {
			url: `/styles/${style || this.map.options.style}`
		};
		
		this.obj = document.createElement('link');
		this.obj.rel = 'stylesheet';
		this.obj.type = 'text/css';
		this.obj.href = this.style.url + '/style.scss';

		this.obj.onload = this.parse;
		document.head.appendChild(this.obj);
	}

	parse = () => {

	}
};

export default Style;