/*

Surfy° Maps. Utils

*/

class Utils {
	
	constructor(map){
		this.map = map;
	}

	xy = (coords, offset=true, custom=false) => {
		const [lng, lat] = coords;
		const mapWidth = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;

		let x = (lng + 180) * (mapWidth / 360);
		const radians = lat * Math.PI / 180;
    	const mercatorY = Math.log(Math.tan((Math.PI / 4) + (radians / 2)));
    	let y = mapWidth / 2 - (mapWidth * mercatorY) / (2 * Math.PI);

    	// Substruct center to change frame of reference
		if(offset){
			x -= this.map.view.origin[0];
			y -= this.map.view.origin[1];
		}

		// If custom layer
		if(custom){
			// x = x / this.map.view.scale - this.map.view.x;
			// x += this.map.view.width / 2;
			// y += this.map.view.height / 2;
			// y = y / this.map.view.scale - this.map.view.y;
		}

    	x = Math.round( x * 100 ) / 100;
		y = Math.round( y * 100 ) / 100;

		return [x, y];
	}

	xy2 = (coords, offset=true, custom=false) => {

		/*

		Convert coordinates to pixels
		@coords - [lng, lat]
		@offset - substruct origin coords of the map, we don't use it to calc initial centre

		*/

		const [lng, lat] = coords;
		const scale = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;
		let x = (lng + 180) / 360 * scale;

		const radians = lat * Math.PI / 180;
		const mercatorY = Math.log(Math.tan((Math.PI / 4) + (radians / 2)));
		let y = (1 - (mercatorY / Math.PI)) / 2 * scale;

		// Substruct center to change frame of reference
		if(offset){
			x -= this.map.view.origin[0];
			y -= this.map.view.origin[1];
		}

		// If custom layer
		if(custom){
			x = x / this.map.view.scale - this.map.view.x;
			y = y / this.map.view.scale - this.map.view.y;
		}

		x = Math.round( x * 100 ) / 100;
		y = Math.round( y * 100 ) / 100;

		return [x, y];
	}

	coords = (xy, offset=true, custom=false) => {

		/*

		Convert pixels to coordinates
		@xy - [x,y]
		@offset - substruct origin coords of the map

		*/

		let [x, y] = xy;

		// If custom layer
		if(custom){
			x = (x + this.map.view.x) * this.map.view.scale;
			y = (y + this.map.view.y) * this.map.view.scale;
		}

		// Offset centre
		if(offset){
			x += this.map.view.origin[0];
			y += this.map.view.origin[1];
		}

		const scale = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;
		let lng = (x / scale) * 360 - 180;
		const mercatorY = (1 - (2 * y / scale)) * Math.PI;
		let lat = (2 * Math.atan(Math.exp(mercatorY)) - Math.PI / 2) * (180 / Math.PI);

		
		return [ Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6 ];
	}

	/*

	Generate ID

	*/

	id = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(8);
	}
}

export default Utils;