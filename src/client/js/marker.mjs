/*

Surfy° Maps. Marker

*/

const fields = ['coords', 'group', 'class', 'content'];

class Marker {

	constructor(map, options){
		this.map = map;
		this.coords;

		// Join Options
		for(let field in options){
			if(fields.includes(field)){
				this['_'+field] = options[field];
			}
		}

		// Create Element
		this.el = document.createElement('div');

		// Set up ID
		this._id = this.map.utils.id(); // System ID
		this.id = options.id || this._id; // Custom or System ID
		this.el.dataset.id = this.id;
		
		// Append Custom Class
		this.class = this._class;

		// Content

		if(this._content){
			this.el.innerHTML = this._content;
		}

		// Set up Position
		const [x, y] = this.map.utils.xy(this._coords, true, true);
		this.el.style.top = y + 'px';
		this.el.style.left = x + 'px';

		this.map.overlay.el.appendChild(this.el);
		

		// Add marker to the list
		this.map.overlay.items[this._id] = this;

		if(this._group){
			if(!this.map.overlay.groups[this._group]){
				this.map.overlay.groups[this._group] = [];
			}
			this.map.overlay.groups[this._group].push(this._id);
			this.el.dataset.group = this._group;
		}
	}

	/*

	Click

	*/

	click = callback => {
		this.el.addEventListener('click', callback);
		this.el.addEventListener('touchstart', this.tap);
		this.el.addEventListener('touchend', this.tap);
	}

	clickOff = () => {
		this.el.removeEventListener('click', callback);
		this.el.removeEventListener('touchstart', this.tap);
		this.el.removeEventListener('touchend', this.tap);
	}

	tap(e) {
		switch(e.type){
			case 'touchstart':
				this.startTime = new Date();
				break;
			case 'touchend':
				if(new Date() - this.startTime < 250){
					this.click();
				}
				break;
		}
	}

	/*

	Remove

	*/

	remove = () => {
		this.el.remove();
		delete this.map.overlay.items[this._id];
	}

	/*

	Coords

	*/

	get coords(){
		return this._coords;
	}

	set coords(coords){
		this._coords = coords;
		this.updatePosition();
		return true;
	}

	/*

	Update Marker Position

	*/

	updatePosition = () => {
		const [x, y] = this.map.utils.xy(this._coords, true, true);
		this.el.style.top = y + 'px';
		this.el.style.left = x + 'px';
	}

	/*

	Class

	*/

	get class(){
		return this._class;
	}

	set class(className=''){
		this._class = ('m ' + className).trim();
		this.el.setAttribute('class', this._class);
		return true;
	}

	/*

	Content

	*/

	get content(){
		return this._content;
	}

	set content(content){
		this._content = content;
		this.el.innerHTML = content;
		return true;
	}

}


export default Marker;